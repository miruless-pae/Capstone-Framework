import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { Platform, SocialAccountStatus } from '../../common/enums.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { PostSchedule } from '../../post-schedules/entities/post-schedule.entity.js';

// Akun media sosial yang dihubungkan ke brand. Satu brand boleh punya banyak akun,
// tetapi akun yang sama (platform + account_id) tidak boleh terhubung dua kali.
// Token OAuth TIDAK disimpan di sini, melainkan di oauth_tokens.
@Entity({ name: 'social_accounts' })
@Index(['brandId', 'platform', 'accountId'], { unique: true, where: '"deleted_at" IS NULL' })
export class SocialAccount extends AuditedEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.socialAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @Column({ type: 'enum', enum: Platform })
  platform: Platform;

  // Nama yang tampil di UI, mis. "@vibr.studio"
  @Column({ name: 'account_name', type: 'varchar', length: 150 })
  accountName: string;

  // ID akun di platform asal (dari OAuth)
  @Column({ name: 'account_id', type: 'varchar', length: 100 })
  accountId: string;

  @Column({ type: 'enum', enum: SocialAccountStatus, default: SocialAccountStatus.CONNECTED })
  status: SocialAccountStatus;

  @OneToMany(() => PostSchedule, (schedule) => schedule.socialAccount)
  schedules: Relation<PostSchedule[]>;
}
