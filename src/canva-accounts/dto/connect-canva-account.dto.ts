import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Hasil OAuth Canva yang diselesaikan di sisi aplikasi.
export class ConnectCanvaAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  canvaUserId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
