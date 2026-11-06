import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Joi from 'joi';
import { AppController } from './app.controller.js';
import { SimpleLoggerMiddleware } from './middlewares/simple-logger/simple-logger.middleware.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { SocialAccountsModule } from './social-accounts/social-accounts.module.js';
import { CanvaAccountsModule } from './canva-accounts/canva-accounts.module.js';
import { MediaModule } from './media/media.module.js';
import { CaptionsModule } from './captions/captions.module.js';
import { AiJobsModule } from './ai-jobs/ai-jobs.module.js';
import { PostSchedulesModule } from './post-schedules/post-schedules.module.js';
import { PublishedPostsModule } from './published-posts/published-posts.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ActivityLogsModule } from './activity-logs/activity-logs.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        // basis URL publik object storage; URL media = STORAGE_BASE_URL + storage_key
        STORAGE_BASE_URL: Joi.string().uri().default('http://localhost:3000/files'),
        // job yang mem-publish post terjadwal yang sudah jatuh tempo
        SCHEDULER_ENABLED: Joi.boolean().default(true),
        SCHEDULER_INTERVAL_MS: Joi.number().min(1000).default(30000),
        SCHEDULER_BATCH_SIZE: Joi.number().min(1).max(200).default(20),
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        // Hanya untuk development: tabel dibuat/diubah otomatis dari entity.
        // Di production gunakan migration, jangan synchronize.
        synchronize: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,
    UsersModule,
    BrandsModule,
    SocialAccountsModule,
    CanvaAccountsModule,
    MediaModule,
    CaptionsModule,
    AiJobsModule,
    PostSchedulesModule,
    PublishedPostsModule,
    InsightsModule,
    CommentsModule,
    NotificationsModule,
    ActivityLogsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SimpleLoggerMiddleware).forRoutes('*');
  }
}
