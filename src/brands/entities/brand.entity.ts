import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { SocialAccount } from '../../social-accounts/entities/social-account.entity.js';
import { MediaAsset } from '../../media/entities/media-asset.entity.js';
import { Folder } from '../../media/entities/folder.entity.js';
import { GeneratedCaption } from '../../captions/entities/generated-caption.entity.js';
import { PostSchedule } from '../../post-schedules/entities/post-schedule.entity.js';
import { AiJob } from '../../ai-jobs/entities/ai-job.entity.js';

// Layar: Setup Brand ("Tell us about your brand")
@Entity({ name: 'brands' })
export class Brand extends AuditedEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.brands, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  // Suara brand yang dikirim ke AI, teks bebas (mis. "santai, ramah, sedikit humor").
  @Column({ name: 'tone_of_voice', type: 'varchar', length: 100, nullable: true })
  toneOfVoice: string | null;

  // Warna brand, format hex "#RRGGBB"
  @Column({ name: 'primary_color', type: 'varchar', length: 20, nullable: true })
  primaryColor: string | null;

  @Column({ name: 'secondary_color', type: 'varchar', length: 20, nullable: true })
  secondaryColor: string | null;

  // Logo adalah media biasa di library brand ("Profile Picture" di Setup Brand)
  @Column({ name: 'logo_asset_id', type: 'uuid', nullable: true })
  logoAssetId: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'logo_asset_id' })
  logoAsset: Relation<MediaAsset> | null;

  @OneToMany(() => SocialAccount, (account) => account.brand)
  socialAccounts: Relation<SocialAccount[]>;

  @OneToMany(() => Folder, (folder) => folder.brand)
  folders: Relation<Folder[]>;

  @OneToMany(() => MediaAsset, (asset) => asset.brand)
  mediaAssets: Relation<MediaAsset[]>;

  @OneToMany(() => GeneratedCaption, (caption) => caption.brand)
  captions: Relation<GeneratedCaption[]>;

  @OneToMany(() => PostSchedule, (schedule) => schedule.brand)
  schedules: Relation<PostSchedule[]>;

  @OneToMany(() => AiJob, (job) => job.brand)
  aiJobs: Relation<AiJob[]>;
}
