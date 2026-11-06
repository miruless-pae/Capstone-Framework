import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './entities/media-asset.entity.js';
import { Folder } from './entities/folder.entity.js';
import { BrandsModule } from '../brands/brands.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { FoldersService } from './folders.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset, Folder]), BrandsModule, ActivityLogsModule],
  controllers: [MediaController],
  providers: [MediaService, FoldersService],
  exports: [MediaService],
})
export class MediaModule {}
