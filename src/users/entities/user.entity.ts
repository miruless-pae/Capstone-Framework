import { Column, Entity, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { UserStatus } from '../../common/enums.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { CanvaAccount } from '../../canva-accounts/entities/canva-account.entity.js';
import { Notification } from '../../notifications/entities/notification.entity.js';
import { ActivityLog } from '../../activity-logs/entities/activity-log.entity.js';

// Layar: Sign Up, Sign In, Halaman Profile
@Entity({ name: 'users' })
export class User extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // unique tanpa syarat deleted_at: email akun yang sudah dihapus tidak dipakai ulang
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // select:false -> hash tidak ikut terbawa di query biasa / response
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date | null;

  // Dua kolom di bawah di luar daftar entitas awal, tetapi dibutuhkan alur "Forgot password".
  // Yang disimpan hanya hash token, bukan token aslinya.
  @Column({ name: 'reset_token_hash', type: 'varchar', length: 128, nullable: true, select: false })
  resetTokenHash: string | null;

  @Column({ name: 'reset_token_expires_at', type: 'timestamptz', nullable: true, select: false })
  resetTokenExpiresAt: Date | null;

  @OneToMany(() => Brand, (brand) => brand.user)
  brands: Relation<Brand[]>;

  @OneToMany(() => CanvaAccount, (account) => account.user)
  canvaAccounts: Relation<CanvaAccount[]>;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Relation<Notification[]>;

  @OneToMany(() => ActivityLog, (log) => log.user)
  activityLogs: Relation<ActivityLog[]>;
}
