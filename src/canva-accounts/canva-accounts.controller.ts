import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CanvaAccountsService } from './canva-accounts.service.js';
import { ConnectCanvaAccountDto } from './dto/connect-canva-account.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// Akun Canva milik user, bukan milik brand.
@Controller('canva-accounts')
export class CanvaAccountsController {
  constructor(private readonly canvaAccountsService: CanvaAccountsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.canvaAccountsService.findAll(user.id);
  }

  @Post()
  connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectCanvaAccountDto) {
    return this.canvaAccountsService.connect(user.id, dto);
  }

  @Delete(':id')
  disconnect(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.canvaAccountsService.disconnect(id, user.id);
  }
}
