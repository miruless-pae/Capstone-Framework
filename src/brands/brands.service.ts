import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity.js';
import { MediaAsset } from '../media/entities/media-asset.entity.js';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(MediaAsset)
    private readonly mediaRepository: Repository<MediaAsset>,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // Dipakai modul lain: pastikan brand ini milik user yang login.
  // Brand milik orang lain dijawab 404 (bukan 403) supaya ID-nya tidak bisa ditebak.
  async findOwned(id: string, userId: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({
      where: { id, userId },
      relations: { logoAsset: true },
    });
    if (!brand) {
      throw new NotFoundException('Brand tidak ditemukan');
    }
    return brand;
  }

  async findAll(userId: string): Promise<Brand[]> {
    return await this.brandRepository.find({
      where: { userId },
      relations: { socialAccounts: true, logoAsset: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateBrandDto): Promise<Brand> {
    const saved = await this.brandRepository.save(
      this.brandRepository.create({ ...dto, userId, createdBy: userId, updatedBy: userId }),
    );
    await this.activityLogs.log({
      userId,
      action: 'create',
      entity: 'brands',
      entityId: saved.id,
      metadata: { name: saved.name },
    });
    return await this.findOwned(saved.id, userId);
  }

  async update(id: string, userId: string, dto: UpdateBrandDto): Promise<Brand> {
    await this.findOwned(id, userId);
    if (dto.logoAssetId) {
      const owned = await this.mediaRepository.existsBy({ id: dto.logoAssetId, brandId: id });
      if (!owned) {
        throw new BadRequestException('Logo harus berupa media milik brand ini');
      }
    }
    await this.brandRepository.update(id, { ...dto, updatedBy: userId });
    await this.activityLogs.log({
      userId,
      action: 'update',
      entity: 'brands',
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });
    return await this.findOwned(id, userId);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOwned(id, userId);
    await this.brandRepository.update(id, { updatedBy: userId });
    await this.brandRepository.softDelete(id);
    await this.activityLogs.log({ userId, action: 'delete', entity: 'brands', entityId: id });
    return { message: 'Brand dihapus' };
  }
}
