import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PublishedPostsService } from './published-posts.service.js';
import { ListPublishedPostsQueryDto } from './dto/published-post.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class PublishedPostsController {
  constructor(private readonly publishedPostsService: PublishedPostsService) {}

  @Get('brands/:brandId/published-posts')
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: ListPublishedPostsQueryDto,
  ) {
    return this.publishedPostsService.findAll(brandId, user.id, query);
  }

  @Get('published-posts/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.publishedPostsService.findOne(id, user.id);
  }
}
