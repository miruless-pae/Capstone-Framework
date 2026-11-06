import { Controller, Get, Query } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service.js';
import { ListActivityLogsQueryDto } from './dto/activity-log.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: ListActivityLogsQueryDto) {
    return this.activityLogsService.findMine(user.id, query);
  }
}
