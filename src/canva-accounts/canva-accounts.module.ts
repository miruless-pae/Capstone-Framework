import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvaAccount } from './entities/canva-account.entity.js';
import { OauthTokensModule } from '../oauth-tokens/oauth-tokens.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { CanvaAccountsController } from './canva-accounts.controller.js';
import { CanvaAccountsService } from './canva-accounts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CanvaAccount]), OauthTokensModule, ActivityLogsModule],
  controllers: [CanvaAccountsController],
  providers: [CanvaAccountsService],
})
export class CanvaAccountsModule {}
