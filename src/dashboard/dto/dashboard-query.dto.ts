import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DashboardQueryDto {
  // zona waktu untuk menentukan "hari ini"; default Asia/Jakarta
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
