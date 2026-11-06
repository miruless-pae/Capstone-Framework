import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { InsightsService } from './insights.service.js';
import { OverviewQueryDto } from './dto/insights-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('brands/:brandId/insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: OverviewQueryDto,
  ) {
    return this.insightsService.overview(brandId, user.id, query);
  }
}
