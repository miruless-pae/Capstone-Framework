import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  // teks bebas, mis. "santai, ramah, sedikit humor"
  @IsOptional()
  @IsString()
  @MaxLength(100)
  toneOfVoice?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'primaryColor harus berformat #RRGGBB' })
  primaryColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'secondaryColor harus berformat #RRGGBB' })
  secondaryColor?: string;
}

// Logo adalah media_assets milik brand ini, jadi baru bisa diisi setelah brand ada:
// buat brand -> daftarkan media -> PATCH logoAssetId.
export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @IsOptional()
  @IsUUID()
  logoAssetId?: string;
}
