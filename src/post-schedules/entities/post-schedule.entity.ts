import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { PostScheduleStatus, PostType } from '../../common/enums.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity.js';
import { GeneratedCaption } from '../../captions/entities/generated-caption.entity.js';
import { PostScheduleMedia } from './post-schedule-media.entity.js';
import { PublishedPost } from '../../published-posts/entities/published-post.entity.js';

// Inti sistem. Satu baris = satu posting ke SATU akun sosial. Untuk tayang di Instagram dan
// Facebook sekaligus, buat dua baris. Layar: New Post, Schedule Calendar, Today's schedule.
@Entity({ name: 'post_schedules' })
@Index(['brandId', 'scheduledAt'])
@Index(['status', 'scheduledAt'])
export class PostSchedule extends AuditedEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @Column({ name: 'social_account_id', type: 'uuid' })
  socialAccountId: string;

  @ManyToOne(() => SocialAccount, (account) => account.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'social_account_id' })
  socialAccount: Relation<SocialAccount>;

  @Column({ name: 'caption_id', type: 'uuid', nullable: true })
  captionId: string | null;

  @ManyToOne(() => GeneratedCaption, (caption) => caption.schedules, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'caption_id' })
  caption: Relation<GeneratedCaption> | null;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ name: 'post_type', type: 'enum', enum: PostType, default: PostType.POST })
  postType: PostType;

  @Column({ type: 'enum', enum: PostScheduleStatus, default: PostScheduleStatus.DRAFT })
  status: PostScheduleStatus;

  // waktu tayang (UTC); null selama masih draft
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  // 1 posting -> banyak media (carousel), berurutan lewat sort_order
  @OneToMany(() => PostScheduleMedia, (item) => item.schedule)
  media: Relation<PostScheduleMedia[]>;

  // terisi setelah publish berhasil (1 : 0..1)
  @OneToOne(() => PublishedPost, (published) => published.schedule)
  publishedPost: Relation<PublishedPost> | null;
}
