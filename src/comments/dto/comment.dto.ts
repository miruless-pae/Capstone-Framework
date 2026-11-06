import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const COMMENT_FILTERS = ['all', 'positive', 'questions', 'negative'] as const;
export type CommentFilter = (typeof COMMENT_FILTERS)[number];

export class ListCommentsQueryDto {
  // chip "All / Positive / Questions / Negative"
  @IsOptional()
  @IsIn(COMMENT_FILTERS)
  filter?: CommentFilter;

  // dropdown rentang tanggal "Oct 13-19, 2026"
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ReplyCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  replyText: string;
}
