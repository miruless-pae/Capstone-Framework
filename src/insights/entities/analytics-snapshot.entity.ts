import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { numberTransformer } from '../../common/utils/transformers.js';
import { PublishedPost } from '../../published-posts/entities/published-post.entity.js';

// Foto performa satu posting pada satu tanggal, disimpan berkala dari API platform.
// Angkanya kumulatif sampai snapshot_date, jadi untuk "total saat ini" pakai snapshot terbaru
// per posting (jangan dijumlahkan antar tanggal).
@Entity({ name: 'analytics_snapshots' })
@Index(['publishedPostId', 'snapshotDate'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['snapshotDate'])
export class AnalyticsSnapshot extends AppBaseEntity {
  @Column({ name: 'published_post_id', type: 'uuid' })
  publishedPostId: string;

  @ManyToOne(() => PublishedPost, (post) => post.snapshots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'published_post_id' })
  publishedPost: Relation<PublishedPost>;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  reach: number;

  // total interaksi (like + komentar + share + save)
  @Column({ type: 'int', default: 0 })
  engagement: number;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  comments: number;

  @Column({ type: 'int', default: 0 })
  shares: number;

  @Column({ type: 'int', default: 0 })
  saves: number;

  // persen, mis. 8.35 berarti 8,35%
  @Column({
    name: 'engagement_rate',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  engagementRate: number;

  @Column({
    name: 'avg_reach_per_post',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  avgReachPerPost: number;
}
