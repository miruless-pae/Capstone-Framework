import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AiJobsService } from './ai-jobs.service.js';
import { GenerateImageDto, ListAiJobsQueryDto, RemoveBackgroundDto } from './dto/ai-job.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

// 202: permintaan diterima dan diproses di latar belakang; poll GET /ai-jobs/:id
@Controller()
export class AiJobsController {
  constructor(private readonly aiJobsService: AiJobsService) {}

  @Get('brands/:brandId/ai-jobs')
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: ListAiJobsQueryDto,
  ) {
    return this.aiJobsService.findAll(brandId, user.id, query);
  }

  @Get('ai-jobs/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.aiJobsService.findOne(id, user.id);
  }

  @Post('brands/:brandId/ai-jobs/generate-image')
  @HttpCode(HttpStatus.ACCEPTED)
  generateImage(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: GenerateImageDto,
  ) {
    return this.aiJobsService.generateImage(brandId, user.id, dto);
  }

  @Post('ai-jobs/:id/regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  regenerate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.aiJobsService.regenerate(id, user.id);
  }

  @Post('brands/:brandId/ai-jobs/remove-background')
  @HttpCode(HttpStatus.ACCEPTED)
  removeBackground(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: RemoveBackgroundDto,
  ) {
    return this.aiJobsService.removeBackground(brandId, user.id, dto);
  }
}
