import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

// Audit log: hanya ditambah, tidak pernah diubah atau dihapus, jadi satu-satunya tabel tanpa
// updated_at dan deleted_at.
@Entity({ name: 'activity_logs' })
@Index(['userId', 'createdAt'])
@Index(['entity', 'entityId'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, (user) => user.activityLogs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  // mis. 'create', 'update', 'delete', 'publish', 'connect'
  @Column({ type: 'varchar', length: 100 })
  action: string;

  // nama tabel yang disentuh, mis. 'post_schedules'
  @Column({ type: 'varchar', length: 100 })
  entity: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
