import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity.js';
import { CommentLabel } from './entities/comment-label.entity.js';
import { CommentReply } from './entities/comment-reply.entity.js';
import { AiJob } from '../ai-jobs/entities/ai-job.entity.js';
import { AiProviderModule } from '../ai/ai-provider.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentLabel, CommentReply, AiJob]),
    AiProviderModule,
    BrandsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
