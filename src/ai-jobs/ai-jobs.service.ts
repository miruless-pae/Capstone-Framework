import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiJob } from './entities/ai-job.entity.js';
import { MediaAsset } from '../media/entities/media-asset.entity.js';
import { GenerateImageDto, ListAiJobsQueryDto, RemoveBackgroundDto } from './dto/ai-job.dto.js';
import { AiProvider, StoredImage } from '../ai/ai-provider.js';
import {
  AiJobStatus,
  AiJobType,
  AiModel,
  AiStyle,
  AspectRatio,
  MediaOrigin,
  MediaType,
} from '../common/enums.js';
import { BrandsService } from '../brands/brands.service.js';

// Bentuk input_json untuk job gambar
interface ImageInput {
  prompt: string;
  model: AiModel;
  style: AiStyle | null;
  aspectRatio: AspectRatio;
  referenceAssetId: string | null;
}

const IMAGE_JOB_TYPES = [AiJobType.GENERATE_IMAGE, AiJobType.REGENERATE_IMAGE];

@Injectable()
export class AiJobsService {
  private readonly logger = new Logger(AiJobsService.name);

  constructor(
    @InjectRepository(AiJob)
    private readonly jobRepository: Repository<AiJob>,
    @InjectRepository(MediaAsset)
    private readonly mediaRepository: Repository<MediaAsset>,
    private readonly brandsService: BrandsService,
    private readonly aiProvider: AiProvider,
  ) {}

  async findAll(brandId: string, userId: string, query: ListAiJobsQueryDto): Promise<AiJob[]> {
    await this.brandsService.findOwned(brandId, userId);
    return await this.jobRepository.find({
      where: { brandId, ...(query.jobType ? { jobType: query.jobType } : {}) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // Dipolling oleh layar "Result Loading" sampai status = completed / failed.
  // Jika sudah selesai, media hasilnya ikut disertakan.
  async findOne(id: string, userId: string) {
    const job = await this.findOwned(id, userId);
    const mediaAssetId = job.outputJson?.mediaAssetId;
    const resultAsset =
      typeof mediaAssetId === 'string'
        ? await this.mediaRepository.findOne({ where: { id: mediaAssetId } })
        : null;
    return { ...job, resultAsset };
  }

  // Semua endpoint pembuat job: simpan permintaan (pending), proses di latar belakang,
  // dan langsung kembalikan job supaya client bisa menampilkan loading.
  async generateImage(brandId: string, userId: string, dto: GenerateImageDto): Promise<AiJob> {
    await this.brandsService.findOwned(brandId, userId);
    await this.assertAsset(brandId, dto.referenceAssetId, 'Gambar referensi');

    const input: ImageInput = {
      prompt: dto.prompt,
      model: dto.model ?? AiModel.FLUX_SCHNELL,
      style: dto.style ?? null,
      aspectRatio: dto.aspectRatio ?? AspectRatio.SQUARE,
      referenceAssetId: dto.referenceAssetId ?? null,
    };
    return await this.enqueue(brandId, userId, AiJobType.GENERATE_IMAGE, input.model, { ...input });
  }

  // "Generate ulang": job baru dengan parameter yang sama dari job gambar sebelumnya.
  async regenerate(id: string, userId: string): Promise<AiJob> {
    const original = await this.findOwned(id, userId);
    if (!IMAGE_JOB_TYPES.includes(original.jobType)) {
      throw new BadRequestException('Hanya job pembuatan gambar yang bisa digenerate ulang');
    }
    return await this.enqueue(
      original.brandId,
      userId,
      AiJobType.REGENERATE_IMAGE,
      original.model,
      { ...original.inputJson, regeneratedFrom: original.id },
    );
  }

  async removeBackground(brandId: string, userId: string, dto: RemoveBackgroundDto): Promise<AiJob> {
    await this.brandsService.findOwned(brandId, userId);
    await this.assertAsset(brandId, dto.mediaAssetId, 'Media');
    return await this.enqueue(brandId, userId, AiJobType.REMOVE_BACKGROUND, null, {
      mediaAssetId: dto.mediaAssetId,
    });
  }

  // ---------- internal ----------

  private async enqueue(
    brandId: string,
    userId: string,
    jobType: AiJobType,
    model: string | null,
    inputJson: Record<string, unknown>,
  ): Promise<AiJob> {
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        brandId,
        jobType,
        model,
        status: AiJobStatus.PENDING,
        inputJson,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    void this.process(job.id);
    return job;
  }

  private async process(id: string): Promise<void> {
    try {
      const job = await this.jobRepository.findOneOrFail({
        where: { id },
        relations: { brand: true },
      });
      await this.jobRepository.update(id, { status: AiJobStatus.PROCESSING });

      let image: StoredImage;
      let origin: MediaOrigin;
      if (job.jobType === AiJobType.REMOVE_BACKGROUND) {
        const source = await this.mediaRepository.findOneByOrFail({
          id: job.inputJson.mediaAssetId as string,
        });
        image = await this.aiProvider.removeBackground({
          sourceStorageKey: source.storageKey,
          filename: source.filename,
        });
        origin = MediaOrigin.BACKGROUND_REMOVAL;
      } else {
        const input = job.inputJson as unknown as ImageInput;
        const reference = input.referenceAssetId
          ? await this.mediaRepository.findOneBy({ id: input.referenceAssetId })
          : null;
        image = await this.aiProvider.generateImage({
          prompt: input.prompt,
          model: input.model,
          style: input.style,
          toneOfVoice: job.brand.toneOfVoice,
          aspectRatio: input.aspectRatio,
          referenceStorageKey: reference?.storageKey ?? null,
        });
        origin = MediaOrigin.IMAGE_AI;
      }

      // hasil masuk ke library brand, sama seperti file dari sumber lain
      const asset = await this.mediaRepository.save(
        this.mediaRepository.create({
          brandId: job.brandId,
          type: MediaType.IMAGE,
          origin,
          storageKey: image.storageKey,
          filename: image.filename,
          mimeType: image.mimeType,
          size: image.size,
          width: image.width,
          height: image.height,
          createdBy: job.createdBy,
          updatedBy: job.createdBy,
        }),
      );

      await this.jobRepository.update(id, {
        status: AiJobStatus.COMPLETED,
        outputJson: { mediaAssetId: asset.id },
      });
    } catch (error) {
      this.logger.error(`AI job ${id} gagal`, error as Error);
      await this.jobRepository.update(id, {
        status: AiJobStatus.FAILED,
        outputJson: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  private async findOwned(id: string, userId: string): Promise<AiJob> {
    const job = await this.jobRepository.findOne({ where: { id, brand: { userId } } });
    if (!job) {
      throw new NotFoundException('AI job tidak ditemukan');
    }
    return job;
  }

  private async assertAsset(brandId: string, assetId: string | undefined, label: string) {
    if (assetId && !(await this.mediaRepository.existsBy({ id: assetId, brandId }))) {
      throw new NotFoundException(`${label} tidak ditemukan di brand ini`);
    }
  }
}
