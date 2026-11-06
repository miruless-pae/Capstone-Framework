import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneratedCaption } from './entities/generated-caption.entity.js';
import { AiJob } from '../ai-jobs/entities/ai-job.entity.js';
import { AiProviderModule } from '../ai/ai-provider.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { CaptionsController } from './captions.controller.js';
import { CaptionsService } from './captions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedCaption, AiJob]), AiProviderModule, BrandsModule],
  controllers: [CaptionsController],
  providers: [CaptionsService],
  exports: [CaptionsService],
})
export class CaptionsModule {}
