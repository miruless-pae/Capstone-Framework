import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';

// Akun Canva milik user (bukan milik brand). Token-nya ada di oauth_tokens (provider = canva).
@Entity({ name: 'canva_accounts' })
@Index(['userId', 'canvaUserId'], { unique: true, where: '"deleted_at" IS NULL' })
export class CanvaAccount extends AppBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.canvaAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'canva_user_id', type: 'varchar', length: 100 })
  canvaUserId: string;
}
