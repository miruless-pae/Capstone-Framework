import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GeneratedCaption } from './entities/generated-caption.entity.js';
import { AiJob } from '../ai-jobs/entities/ai-job.entity.js';
import { GenerateCaptionDto, UpdateCaptionDto } from './dto/caption.dto.js';
import { AiProvider } from '../ai/ai-provider.js';
import { AiJobStatus, AiJobType } from '../common/enums.js';
import { BrandsService } from '../brands/brands.service.js';

@Injectable()
export class CaptionsService {
  private readonly logger = new Logger(CaptionsService.name);

  constructor(
    @InjectRepository(GeneratedCaption)
    private readonly captionRepository: Repository<GeneratedCaption>,
    @InjectRepository(AiJob)
    private readonly jobRepository: Repository<AiJob>,
    private readonly brandsService: BrandsService,
    private readonly aiProvider: AiProvider,
  ) {}

  async findAll(brandId: string, userId: string): Promise<GeneratedCaption[]> {
    await this.brandsService.findOwned(brandId, userId);
    return await this.captionRepository.find({
      where: { brandId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findOwned(id: string, userId: string): Promise<GeneratedCaption> {
    const caption = await this.captionRepository.findOne({ where: { id, brand: { userId } } });
    if (!caption) {
      throw new NotFoundException('Caption tidak ditemukan');
    }
    return caption;
  }

  // Caption dibuat sinkron (cepat), tetapi tetap dicatat sebagai ai_jobs agar riwayat AI lengkap.
  async generate(brandId: string, userId: string, dto: GenerateCaptionDto): Promise<GeneratedCaption> {
    const brand = await this.brandsService.findOwned(brandId, userId);
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        brandId,
        jobType: AiJobType.CAPTION,
        status: AiJobStatus.PROCESSING,
        inputJson: { prompt: dto.prompt },
        createdBy: userId,
        updatedBy: userId,
      }),
    );

    try {
      const result = await this.aiProvider.generateCaption({
        prompt: dto.prompt,
        brandName: brand.name,
        industry: brand.industry,
        toneOfVoice: brand.toneOfVoice,
      });
      const caption = await this.captionRepository.save(
        this.captionRepository.create({
          brandId,
          prompt: dto.prompt,
          caption: result.caption,
          hashtags: result.hashtags,
          llmModel: result.model,
          createdBy: userId,
          updatedBy: userId,
        }),
      );
      await this.jobRepository.update(job.id, {
        status: AiJobStatus.COMPLETED,
        model: result.model,
        outputJson: { captionId: caption.id },
      });
      return caption;
    } catch (error) {
      this.logger.error(`Caption job ${job.id} gagal`, error as Error);
      await this.jobRepository.update(job.id, {
        status: AiJobStatus.FAILED,
        outputJson: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw new BadGatewayException('Layanan AI gagal membuat caption');
    }
  }

  // Caption yang diketik manual oleh user; dipakai PostSchedulesService.
  async createManual(
    brandId: string,
    userId: string,
    caption: string,
    manager?: EntityManager,
  ): Promise<GeneratedCaption> {
    const repository = manager ? manager.getRepository(GeneratedCaption) : this.captionRepository;
    return await repository.save(
      repository.create({
        brandId,
        caption,
        hashtags: [],
        prompt: null,
        llmModel: null,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
  }

  async update(id: string, userId: string, dto: UpdateCaptionDto): Promise<GeneratedCaption> {
    await this.findOwned(id, userId);
    await this.captionRepository.update(id, { ...dto, updatedBy: userId });
    return await this.findOwned(id, userId);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOwned(id, userId);
    await this.captionRepository.update(id, { updatedBy: userId });
    await this.captionRepository.softDelete(id);
    return { message: 'Caption dihapus' };
  }
}
