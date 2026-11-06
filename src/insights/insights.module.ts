import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity.js';
import { BrandsModule } from '../brands/brands.module.js';
import { InsightsController } from './insights.controller.js';
import { InsightsService } from './insights.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsSnapshot]), BrandsModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
