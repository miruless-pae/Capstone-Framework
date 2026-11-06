import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CaptionsService } from './captions.service.js';
import { GenerateCaptionDto, UpdateCaptionDto } from './dto/caption.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class CaptionsController {
  constructor(private readonly captionsService: CaptionsService) {}

  @Get('brands/:brandId/captions')
  findAll(@CurrentUser() user: AuthUser, @Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.captionsService.findAll(brandId, user.id);
  }

  // Generate dengan AI. Hasilnya tersimpan dan id-nya bisa dipakai di banyak jadwal.
  @Post('brands/:brandId/captions/generate')
  @HttpCode(HttpStatus.CREATED)
  generate(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: GenerateCaptionDto,
  ) {
    return this.captionsService.generate(brandId, user.id, dto);
  }

  @Get('captions/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.captionsService.findOwned(id, user.id);
  }

  @Patch('captions/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaptionDto,
  ) {
    return this.captionsService.update(id, user.id, dto);
  }

  @Delete('captions/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.captionsService.remove(id, user.id);
  }
}
