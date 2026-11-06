import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialAccount } from './entities/social-account.entity.js';
import { BrandsModule } from '../brands/brands.module.js';
import { OauthTokensModule } from '../oauth-tokens/oauth-tokens.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { SocialAccountsController } from './social-accounts.controller.js';
import { SocialAccountsService } from './social-accounts.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SocialAccount]),
    BrandsModule,
    OauthTokensModule,
    ActivityLogsModule,
  ],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}
