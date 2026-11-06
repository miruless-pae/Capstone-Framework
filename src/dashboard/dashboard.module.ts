import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostSchedule } from '../post-schedules/entities/post-schedule.entity.js';
import { Comment } from '../comments/entities/comment.entity.js';
import { BrandsModule } from '../brands/brands.module.js';
import { UsersModule } from '../users/users.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PostSchedule, Comment]), BrandsModule, UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
