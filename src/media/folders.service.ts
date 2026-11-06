import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Folder } from './entities/folder.entity.js';
import { MediaAsset } from './entities/media-asset.entity.js';
import { CreateFolderDto, UpdateFolderDto } from './dto/create-media.dto.js';
import { BrandsService } from '../brands/brands.service.js';
import { isUniqueViolation } from '../common/utils/db-errors.js';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly dataSource: DataSource,
    private readonly brandsService: BrandsService,
  ) {}

  async findAll(brandId: string, userId: string): Promise<Folder[]> {
    await this.brandsService.findOwned(brandId, userId);
    return await this.folderRepository.find({ where: { brandId }, order: { name: 'ASC' } });
  }

  async create(brandId: string, userId: string, dto: CreateFolderDto): Promise<Folder> {
    await this.brandsService.findOwned(brandId, userId);
    try {
      return await this.folderRepository.save(
        this.folderRepository.create({
          brandId,
          name: dto.name,
          createdBy: userId,
          updatedBy: userId,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Nama folder sudah dipakai di brand ini');
      }
      throw error;
    }
  }

  async update(id: string, userId: string, dto: UpdateFolderDto): Promise<Folder> {
    await this.findOwned(id, userId);
    try {
      await this.folderRepository.update(id, { ...dto, updatedBy: userId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Nama folder sudah dipakai di brand ini');
      }
      throw error;
    }
    return await this.findOwned(id, userId);
  }

  // Soft delete tidak memicu ON DELETE SET NULL, jadi media di dalamnya dikeluarkan manual
  // (tetap ada di library, hanya tanpa folder).
  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOwned(id, userId);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(MediaAsset).update({ folderId: id }, { folderId: null });
      await manager.getRepository(Folder).update(id, { updatedBy: userId });
      await manager.getRepository(Folder).softDelete(id);
    });
    return { message: 'Folder dihapus' };
  }

  private async findOwned(id: string, userId: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({ where: { id, brand: { userId } } });
    if (!folder) {
      throw new NotFoundException('Folder tidak ditemukan');
    }
    return folder;
  }
}
