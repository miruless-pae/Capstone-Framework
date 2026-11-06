import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostSchedule } from './entities/post-schedule.entity.js';
import { PostScheduleMedia } from './entities/post-schedule-media.entity.js';
import { SocialAccount } from '../social-accounts/entities/social-account.entity.js';
import { MediaAsset } from '../media/entities/media-asset.entity.js';
import { PublishedPost } from '../published-posts/entities/published-post.entity.js';
import { BrandsModule } from '../brands/brands.module.js';
import { CaptionsModule } from '../captions/captions.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { PostSchedulesController } from './post-schedules.controller.js';
import { PostSchedulesService } from './post-schedules.service.js';
import { PostSchedulesSchedulerService } from './post-schedules-scheduler.service.js';
import { PlatformPublisher } from './publishers/platform-publisher.js';
import { MockPlatformPublisher } from './publishers/mock-platform.publisher.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostSchedule, PostScheduleMedia, SocialAccount, MediaAsset, PublishedPost]),
    BrandsModule,
    CaptionsModule,
    NotificationsModule,
    ActivityLogsModule,
  ],
  controllers: [PostSchedulesController],
  providers: [
    PostSchedulesService,
    PostSchedulesSchedulerService,
    // GANTI useClass dengan publisher nyata (Instagram/Facebook/Threads) saat sudah siap
    { provide: PlatformPublisher, useClass: MockPlatformPublisher },
  ],
  exports: [PostSchedulesService],
})
export class PostSchedulesModule {}
