import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service.js';
import { ConnectSocialAccountDto } from './dto/connect-social-account.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get('brands/:brandId/social-accounts')
  findAll(@CurrentUser() user: AuthUser, @Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.socialAccountsService.findAll(brandId, user.id);
  }

  @Post('brands/:brandId/social-accounts')
  connect(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: ConnectSocialAccountDto,
  ) {
    return this.socialAccountsService.connect(brandId, user.id, dto);
  }

  @Delete('social-accounts/:id')
  disconnect(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.socialAccountsService.disconnect(id, user.id);
  }
}
