import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Tandai endpoint yang boleh diakses tanpa token (login, register, dst).
// Semua endpoint lain otomatis dilindungi JwtAuthGuard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
