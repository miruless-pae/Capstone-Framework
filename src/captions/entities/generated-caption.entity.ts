import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { PostSchedule } from '../../post-schedules/entities/post-schedule.entity.js';

// Caption dibuat sekali lalu bisa dipakai di banyak jadwal. Caption yang diketik manual
// juga disimpan di sini (prompt dan llm_model = null) supaya post_schedules cukup punya caption_id.
@Entity({ name: 'generated_captions' })
export class GeneratedCaption extends AuditedEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.captions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @Column({ type: 'text', nullable: true })
  prompt: string | null;

  @Column({ type: 'text' })
  caption: string;

  // hashtag tanpa tanda '#', mis. ['FreshIdeas', 'Design']
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  hashtags: string[];

  @Column({ name: 'llm_model', type: 'varchar', length: 100, nullable: true })
  llmModel: string | null;

  @OneToMany(() => PostSchedule, (schedule) => schedule.caption)
  schedules: Relation<PostSchedule[]>;
}
