import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('brands/:brandId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('home')
  home(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.home(brandId, user.id, query);
  }
}
