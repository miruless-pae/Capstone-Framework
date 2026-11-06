import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { Comment } from './comment.entity.js';

// Layar: "Reply dialog". Balasan dari user vibr ke sebuah komentar (created_by = penulisnya).
@Entity({ name: 'comment_replies' })
export class CommentReply extends AuditedEntity {
  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @ManyToOne(() => Comment, (comment) => comment.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: Relation<Comment>;

  @Column({ name: 'reply_text', type: 'text' })
  replyText: string;

  // ID balasan di platform setelah berhasil terkirim
  @Column({ name: 'platform_reply_id', type: 'varchar', length: 150, nullable: true })
  platformReplyId: string | null;

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt: Date | null;
}
