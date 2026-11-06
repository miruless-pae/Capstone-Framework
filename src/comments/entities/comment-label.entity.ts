import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { CommentLabelType } from '../../common/enums.js';
import { numberTransformer } from '../../common/utils/transformers.js';
import { Comment } from './comment.entity.js';

// Hasil analisis sentimen AI untuk satu komentar (1 : 1).
@Entity({ name: 'comment_labels' })
@Index(['commentId'], { unique: true, where: '"deleted_at" IS NULL' })
export class CommentLabel extends AppBaseEntity {
  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @OneToOne(() => Comment, (comment) => comment.label, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: Relation<Comment>;

  @Column({ type: 'enum', enum: CommentLabelType })
  label: CommentLabelType;

  // keyakinan model, 0 sampai 1
  @Column({ type: 'decimal', precision: 5, scale: 4, transformer: numberTransformer })
  confidence: number;

  @Column({ name: 'model_name', type: 'varchar', length: 100 })
  modelName: string;
}
