import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AiJobType, AiModel, AiStyle, AspectRatio } from '../../common/enums.js';

// Layar "Create with AI"
export class GenerateImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;

  @IsOptional()
  @IsEnum(AiModel)
  model?: AiModel;

  @IsOptional()
  @IsEnum(AiStyle)
  style?: AiStyle;

  @IsOptional()
  @IsEnum(AspectRatio)
  aspectRatio?: AspectRatio;

  // "Attach image / reference" -> id media_assets milik brand ini
  @IsOptional()
  @IsUUID()
  referenceAssetId?: string;
}

export class RemoveBackgroundDto {
  @IsUUID()
  mediaAssetId: string;
}

export class ListAiJobsQueryDto {
  @IsOptional()
  @IsEnum(AiJobType)
  jobType?: AiJobType;
}
