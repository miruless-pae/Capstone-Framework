import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthToken } from './entities/oauth-token.entity.js';
import { OauthTokensService } from './oauth-tokens.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OauthToken])],
  providers: [OauthTokensService],
  exports: [OauthTokensService],
})
export class OauthTokensModule {}
