import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MediaService } from './media.service.js';
import { FoldersService } from './folders.service.js';
import {
  CreateFolderDto,
  CreateMediaDto,
  ListMediaQueryDto,
  MoveMediaDto,
  UpdateFolderDto,
} from './dto/create-media.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly foldersService: FoldersService,
  ) {}

  // ---------- media ----------

  @Get('brands/:brandId/media')
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: ListMediaQueryDto,
  ) {
    return this.mediaService.findAll(brandId, user.id, query);
  }

  @Post('brands/:brandId/media')
  create(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(brandId, user.id, dto);
  }

  @Patch('media/:id')
  move(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveMediaDto,
  ) {
    return this.mediaService.move(id, user.id, dto.folderId);
  }

  @Delete('media/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.remove(id, user.id);
  }

  // ---------- folder ----------

  @Get('brands/:brandId/folders')
  findFolders(@CurrentUser() user: AuthUser, @Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.foldersService.findAll(brandId, user.id);
  }

  @Post('brands/:brandId/folders')
  createFolder(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(brandId, user.id, dto);
  }

  @Patch('folders/:id')
  updateFolder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(id, user.id, dto);
  }

  @Delete('folders/:id')
  removeFolder(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.remove(id, user.id);
  }
}
