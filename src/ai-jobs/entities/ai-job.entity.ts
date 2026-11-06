import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { AiJobStatus, AiJobType } from '../../common/enums.js';
import { Brand } from '../../brands/entities/brand.entity.js';

// Riwayat setiap proses AI (gambar, hapus background, caption, sentimen).
// input_json = parameter permintaan; output_json = hasil (mis. id media_assets) atau pesan error.
@Entity({ name: 'ai_jobs' })
@Index(['brandId', 'createdAt'])
export class AiJob extends AuditedEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.aiJobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @Column({ name: 'job_type', type: 'enum', enum: AiJobType })
  jobType: AiJobType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'enum', enum: AiJobStatus, default: AiJobStatus.PENDING })
  status: AiJobStatus;

  @Column({ name: 'input_json', type: 'jsonb', default: () => "'{}'" })
  inputJson: Record<string, unknown>;

  @Column({ name: 'output_json', type: 'jsonb', nullable: true })
  outputJson: Record<string, unknown> | null;
}
