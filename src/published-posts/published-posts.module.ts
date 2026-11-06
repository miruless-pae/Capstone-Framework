import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishedPost } from './entities/published-post.entity.js';
import { AnalyticsSnapshot } from '../insights/entities/analytics-snapshot.entity.js';
import { BrandsModule } from '../brands/brands.module.js';
import { PublishedPostsController } from './published-posts.controller.js';
import { PublishedPostsService } from './published-posts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PublishedPost, AnalyticsSnapshot]), BrandsModule],
  controllers: [PublishedPostsController],
  providers: [PublishedPostsService],
})
export class PublishedPostsModule {}
