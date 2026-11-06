import { PartialType, PickType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MediaOrigin, MediaType } from '../../common/enums.js';

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // batas wajar video; gambar dibatasi lagi di service

// File diunggah ke storage (S3/Cloudinary/dst) oleh client; endpoint ini mendaftarkan metadatanya.
export class CreateMediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(MAX_BYTES)
  size: number;

  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsEnum(MediaOrigin)
  origin?: MediaOrigin;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  // detik
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  // storage_key thumbnail
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;
}

// Memindahkan media ke folder lain. folderId: null = keluar dari folder.
export class MoveMediaDto {
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  folderId: string | null;
}

export class ListMediaQueryDto {
  @IsOptional()
  @IsEnum(MediaOrigin)
  origin?: MediaOrigin;

  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateFolderDto extends PartialType(PickType(CreateFolderDto, ['name'] as const)) {}
