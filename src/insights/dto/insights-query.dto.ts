import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Platform } from '../../common/enums.js';

export class OverviewQueryDto {
  // chip "All / Instagram / Facebook / Threads"
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  // chip "7D / 30D / 90D"
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: '7d' | '30d' | '90d';

  // zona waktu untuk "best post time"; default Asia/Jakarta
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
