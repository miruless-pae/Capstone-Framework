import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiJob } from './entities/ai-job.entity.js';
import { MediaAsset } from '../media/entities/media-asset.entity.js';
import { AiProviderModule } from '../ai/ai-provider.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { AiJobsController } from './ai-jobs.controller.js';
import { AiJobsService } from './ai-jobs.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AiJob, MediaAsset]), AiProviderModule, BrandsModule],
  controllers: [AiJobsController],
  providers: [AiJobsService],
})
export class AiJobsModule {}
