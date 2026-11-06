import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Platform } from '../../common/enums.js';

// Alur OAuth (redirect + callback) diselesaikan di sisi aplikasi; endpoint ini menerima hasilnya.
export class ConnectSocialAccountDto {
  @IsEnum(Platform)
  platform: Platform;

  // nama yang tampil di UI, mis. "@vibr.studio"
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  accountName: string;

  // ID akun di platform asal
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountId: string;

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
