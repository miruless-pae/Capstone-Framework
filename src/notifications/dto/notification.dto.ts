import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationsQueryDto {
  // implicit conversion mengubah string "false" menjadi true, jadi dibaca manual
  @IsOptional()
  @Transform(({ obj }) => obj.unreadOnly === true || obj.unreadOnly === 'true')
  @IsBoolean()
  unreadOnly?: boolean;

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
