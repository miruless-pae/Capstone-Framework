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
import { CommentsService } from './comments.service.js';
import { ListCommentsQueryDto, ReplyCommentDto } from './dto/comment.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('brands/:brandId/comments')
  inbox(
    @CurrentUser() user: AuthUser,
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @Query() query: ListCommentsQueryDto,
  ) {
    return this.commentsService.inbox(brandId, user.id, query);
  }

  // "Mark as resolved"
  @Post('comments/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.setResolved(id, user.id, true);
  }

  @Post('comments/:id/reopen')
  @HttpCode(HttpStatus.OK)
  reopen(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.setResolved(id, user.id, false);
  }

  // analisis sentimen AI (membuat / memperbarui comment_labels)
  @Post('comments/:id/analyze')
  @HttpCode(HttpStatus.OK)
  analyze(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.analyze(id, user.id);
  }

  @Post('comments/:id/replies')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyCommentDto,
  ) {
    return this.commentsService.reply(id, user.id, dto);
  }
}
