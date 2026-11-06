import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { OAuthProvider } from '../../common/enums.js';

// Token OAuth dipisah dari tabel akun supaya query biasa tidak pernah menyentuh token.
// owner_id menunjuk ke social_accounts.id (provider facebook/instagram/threads) atau
// canva_accounts.id (provider canva). Tanpa foreign key karena targetnya dua tabel;
// OauthTokensService yang menjaga konsistensinya.
@Entity({ name: 'oauth_tokens' })
@Index(['provider', 'ownerId'], { unique: true, where: '"deleted_at" IS NULL' })
export class OauthToken extends AppBaseEntity {
  @Column({ type: 'enum', enum: OAuthProvider })
  provider: OAuthProvider;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  // select:false agar tidak ikut ter-load tanpa diminta. Enkripsi level aplikasi: lihat README.
  @Column({ name: 'access_token', type: 'text', select: false })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt: Date | null;
}
