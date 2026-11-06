import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Platform } from '../../common/enums.js';

export class ListPublishedPostsQueryDto {
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
