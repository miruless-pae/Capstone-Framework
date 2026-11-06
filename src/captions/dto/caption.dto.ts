import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Tombol "Generate caption" di layar New Post
export class GenerateCaptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;
}

export class UpdateCaptionDto {
  // batas caption Instagram = 2200 karakter
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  caption?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  hashtags?: string[];
}
