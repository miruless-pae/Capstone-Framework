import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PostScheduleStatus, PostType } from '../../common/enums.js';

export class CreatePostScheduleDto {
  // satu jadwal = satu akun; untuk Instagram + Facebook buat dua jadwal
  @IsUUID()
  socialAccountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  // pakai caption yang sudah ada (hasil AI / dipakai ulang) ...
  @IsOptional()
  @IsUUID()
  captionId?: string;

  // ... atau ketik caption baru (batas Instagram 2200 karakter). Pilih salah satu.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  caption?: string;

  // urutan array = urutan tampil (sort_order)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  mediaAssetIds?: string[];

  // jika diisi -> status scheduled, jika kosong -> draft
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdatePostScheduleDto extends PartialType(CreatePostScheduleDto) {}

export class SchedulePostDto {
  @IsDateString()
  scheduledAt: string;
}

export class ListPostSchedulesQueryDto {
  @IsOptional()
  @IsEnum(PostScheduleStatus)
  status?: PostScheduleStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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

export class CalendarQueryDto {
  // "YYYY-MM", mis. 2026-10
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month harus berformat YYYY-MM' })
  month: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
