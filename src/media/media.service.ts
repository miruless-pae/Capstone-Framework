import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaAsset } from './entities/media-asset.entity.js';
import { Folder } from './entities/folder.entity.js';
import { CreateMediaDto, ListMediaQueryDto } from './dto/create-media.dto.js';
import { MediaOrigin, MediaType } from '../common/enums.js';
import { MAX_IMAGE_BYTES } from '../common/constants.js';
import { BrandsService } from '../brands/brands.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaRepository: Repository<MediaAsset>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly brandsService: BrandsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // "Library" di New Post; bisa difilter ke asalnya (mis. hasil AI = "From your creation")
  async findAll(brandId: string, userId: string, query: ListMediaQueryDto): Promise<MediaAsset[]> {
    await this.brandsService.findOwned(brandId, userId);
    return await this.mediaRepository.find({
      where: {
        brandId,
        ...(query.origin ? { origin: query.origin } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.folderId ? { folderId: query.folderId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOwned(id: string, userId: string): Promise<MediaAsset> {
    const asset = await this.mediaRepository.findOne({ where: { id, brand: { userId } } });
    if (!asset) {
      throw new NotFoundException('Media tidak ditemukan');
    }
    return asset;
  }

  async create(brandId: string, userId: string, dto: CreateMediaDto): Promise<MediaAsset> {
    await this.brandsService.findOwned(brandId, userId);
    const type = dto.type ?? (dto.mimeType.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE);
    if (type === MediaType.IMAGE && dto.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Ukuran gambar maksimal 10 MB');
    }
    await this.assertFolder(brandId, dto.folderId);

    const saved = await this.mediaRepository.save(
      this.mediaRepository.create({
        brandId,
        folderId: dto.folderId ?? null,
        type,
        origin: dto.origin ?? MediaOrigin.GALLERY,
        storageKey: dto.storageKey,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
        width: dto.width ?? null,
        height: dto.height ?? null,
        duration: dto.duration ?? null,
        thumbnail: dto.thumbnail ?? null,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    await this.activityLogs.log({
      userId,
      action: 'create',
      entity: 'media_assets',
      entityId: saved.id,
      metadata: { origin: saved.origin },
    });
    // dimuat ulang agar url / thumbnailUrl terisi
    return await this.mediaRepository.findOneOrFail({ where: { id: saved.id } });
  }

  async move(id: string, userId: string, folderId: string | null): Promise<MediaAsset> {
    const asset = await this.findOwned(id, userId);
    await this.assertFolder(asset.brandId, folderId ?? undefined);
    await this.mediaRepository.update(id, { folderId, updatedBy: userId });
    return await this.findOwned(id, userId);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOwned(id, userId);
    await this.mediaRepository.update(id, { updatedBy: userId });
    await this.mediaRepository.softDelete(id);
    await this.activityLogs.log({ userId, action: 'delete', entity: 'media_assets', entityId: id });
    return { message: 'Media dihapus' };
  }

  private async assertFolder(brandId: string, folderId?: string): Promise<void> {
    if (folderId && !(await this.folderRepository.existsBy({ id: folderId, brandId }))) {
      throw new NotFoundException('Folder tidak ditemukan di brand ini');
    }
  }
}
