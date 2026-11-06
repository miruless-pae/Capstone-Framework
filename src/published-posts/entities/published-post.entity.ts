import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { PostSchedule } from '../../post-schedules/entities/post-schedule.entity.js';
import { AnalyticsSnapshot } from '../../insights/entities/analytics-snapshot.entity.js';
import { Comment } from '../../comments/entities/comment.entity.js';

// Hasil publish yang sukses. Satu jadwal paling banyak punya satu published_post (1 : 0..1).
@Entity({ name: 'published_posts' })
@Index(['scheduleId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['publishedAt'])
export class PublishedPost extends AppBaseEntity {
  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @OneToOne(() => PostSchedule, (schedule) => schedule.publishedPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Relation<PostSchedule>;

  // ID posting di platform asal
  @Column({ name: 'platform_post_id', type: 'varchar', length: 150 })
  platformPostId: string;

  @Column({ name: 'platform_url', type: 'text', nullable: true })
  platformUrl: string | null;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;

  @OneToMany(() => AnalyticsSnapshot, (snapshot) => snapshot.publishedPost)
  snapshots: Relation<AnalyticsSnapshot[]>;

  @OneToMany(() => Comment, (comment) => comment.publishedPost)
  comments: Relation<Comment[]>;
}
