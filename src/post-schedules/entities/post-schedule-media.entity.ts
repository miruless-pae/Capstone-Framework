import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { PostSchedule } from './post-schedule.entity.js';
import { MediaAsset } from '../../media/entities/media-asset.entity.js';

// Penghubung N:N antara jadwal posting dan media (satu posting bisa banyak media).
@Entity({ name: 'post_schedule_media' })
@Index(['scheduleId', 'mediaAssetId'], { unique: true, where: '"deleted_at" IS NULL' })
export class PostScheduleMedia extends AppBaseEntity {
  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => PostSchedule, (schedule) => schedule.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Relation<PostSchedule>;

  @Column({ name: 'media_asset_id', type: 'uuid' })
  mediaAssetId: string;

  @ManyToOne(() => MediaAsset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset: Relation<MediaAsset>;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
