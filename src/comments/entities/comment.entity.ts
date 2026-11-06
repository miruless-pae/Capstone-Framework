import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { PublishedPost } from '../../published-posts/entities/published-post.entity.js';
import { CommentLabel } from './comment-label.entity.js';
import { CommentReply } from './comment-reply.entity.js';

// Layar: Insights -> Comments (inbox). Komentar ditarik dari platform, lalu dianalisis AI
// (comment_labels). Brand dan platform didapat lewat published_post -> schedule.
@Entity({ name: 'comments' })
@Index(['publishedPostId', 'platformCommentId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['commentedAt'])
export class Comment extends AppBaseEntity {
  @Column({ name: 'published_post_id', type: 'uuid' })
  publishedPostId: string;

  @ManyToOne(() => PublishedPost, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'published_post_id' })
  publishedPost: Relation<PublishedPost>;

  // ID komentar di platform asal
  @Column({ name: 'platform_comment_id', type: 'varchar', length: 150 })
  platformCommentId: string;

  @Column({ name: 'author_name', type: 'varchar', length: 150 })
  authorName: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'commented_at', type: 'timestamptz' })
  commentedAt: Date;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  // 1 : 1, belum ada selama komentar belum dianalisis
  @OneToOne(() => CommentLabel, (label) => label.comment)
  label: Relation<CommentLabel> | null;

  @OneToMany(() => CommentReply, (reply) => reply.comment)
  replies: Relation<CommentReply[]>;
}
