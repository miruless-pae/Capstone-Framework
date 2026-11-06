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
  Query,
} from '@nestjs/common';
import { PostSchedulesService } from './post-schedules.service.js';
import {
  CalendarQueryDto,
  CreatePostScheduleDto,
  ListPostSchedulesQueryDto,
  SchedulePostDto,
  UpdatePostScheduleDto,
} from './dto/post-schedule.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class PostSchedulesController {
  constructor(private readonly postSchedulesService: PostSchedulesService) {}

  @Get('brands/:brandId/schedules')
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: ListPostSchedulesQueryDto,
  ) {
    return this.postSchedulesService.findAll(brandId, user.id, query);
  }

  @Get('brands/:brandId/calendar')
  calendar(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: CalendarQueryDto,
  ) {
    return this.postSchedulesService.calendar(brandId, user.id, query);
  }

  @Post('brands/:brandId/schedules')
  create(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Body() dto: CreatePostScheduleDto,
  ) {
    return this.postSchedulesService.create(brandId, user.id, dto);
  }

  @Get('schedules/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.postSchedulesService.findOwned(id, user.id);
  }

  @Patch('schedules/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostScheduleDto,
  ) {
    return this.postSchedulesService.update(id, user.id, dto);
  }

  @Post('schedules/:id/schedule')
  @HttpCode(HttpStatus.OK)
  schedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SchedulePostDto,
  ) {
    return this.postSchedulesService.schedule(id, user.id, dto);
  }

  @Post('schedules/:id/unschedule')
  @HttpCode(HttpStatus.OK)
  unschedule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.postSchedulesService.unschedule(id, user.id);
  }

  @Post('schedules/:id/publish-now')
  @HttpCode(HttpStatus.OK)
  publishNow(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.postSchedulesService.publishNow(id, user.id);
  }

  @Delete('schedules/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.postSchedulesService.remove(id, user.id);
  }
}
