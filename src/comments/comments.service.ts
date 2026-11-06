import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Comment } from './entities/comment.entity.js';
import { CommentLabel } from './entities/comment-label.entity.js';
import { CommentReply } from './entities/comment-reply.entity.js';
import { AiJob } from '../ai-jobs/entities/ai-job.entity.js';
import { ListCommentsQueryDto, ReplyCommentDto } from './dto/comment.dto.js';
import { AiProvider } from '../ai/ai-provider.js';
import { AiJobStatus, AiJobType, CommentLabelType } from '../common/enums.js';
import { BrandsService } from '../brands/brands.service.js';

const INBOX_LIMIT = 100;
// label yang perlu ditanggapi pemilik brand -> masuk section "Priority" selama belum selesai
const NEEDS_RESPONSE_LABELS = [CommentLabelType.NEGATIVE, CommentLabelType.QUESTION];

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(CommentLabel)
    private readonly labelRepository: Repository<CommentLabel>,
    @InjectRepository(CommentReply)
    private readonly replyRepository: Repository<CommentReply>,
    @InjectRepository(AiJob)
    private readonly jobRepository: Repository<AiJob>,
    private readonly brandsService: BrandsService,
    private readonly aiProvider: AiProvider,
  ) {}

  // Query dasar untuk menghitung: semua komentar milik satu brand
  // (comment -> published_post -> post_schedule -> brand).
  private countQuery(brandId: string): SelectQueryBuilder<Comment> {
    return this.commentRepository
      .createQueryBuilder('comment')
      .innerJoin('comment.publishedPost', 'post')
      .innerJoin('post.schedule', 'schedule')
      .leftJoin('comment.label', 'label')
      .where('schedule.brandId = :brandId', { brandId });
  }

  // Query untuk daftar: alias sama dengan countQuery, tetapi relasinya ikut dimuat.
  private listQuery(brandId: string): SelectQueryBuilder<Comment> {
    return this.commentRepository
      .createQueryBuilder('comment')
      .innerJoinAndSelect('comment.publishedPost', 'post')
      .innerJoinAndSelect('post.schedule', 'schedule')
      .innerJoinAndSelect('schedule.socialAccount', 'account')
      .leftJoinAndSelect('comment.label', 'label')
      .leftJoinAndSelect('comment.replies', 'reply')
      .where('schedule.brandId = :brandId', { brandId });
  }

  private applyDateRange(qb: SelectQueryBuilder<Comment>, query: ListCommentsQueryDto) {
    if (query.from) qb.andWhere('comment.commentedAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('comment.commentedAt <= :to', { to: new Date(query.to) });
  }

  // Layar "Insights -> Comments": angka di chip, section "Priority", dan "Recent comments".
  async inbox(brandId: string, userId: string, query: ListCommentsQueryDto) {
    await this.brandsService.findOwned(brandId, userId);

    // angka chip dihitung pada rentang tanggal yang sama, tanpa terpengaruh filter chip
    const countsQuery = this.countQuery(brandId)
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE label.label = :positive)', 'positive')
      .addSelect('COUNT(*) FILTER (WHERE label.label = :question)', 'questions')
      .addSelect('COUNT(*) FILTER (WHERE label.label = :negative)', 'negative')
      .setParameters({
        positive: CommentLabelType.POSITIVE,
        question: CommentLabelType.QUESTION,
        negative: CommentLabelType.NEGATIVE,
      });
    this.applyDateRange(countsQuery, query);
    const raw = await countsQuery.getRawOne();

    const listQuery = this.listQuery(brandId);
    this.applyDateRange(listQuery, query);
    switch (query.filter) {
      case 'positive':
        listQuery.andWhere('label.label = :l', { l: CommentLabelType.POSITIVE });
        break;
      case 'negative':
        listQuery.andWhere('label.label = :l', { l: CommentLabelType.NEGATIVE });
        break;
      case 'questions':
        listQuery.andWhere('label.label = :l', { l: CommentLabelType.QUESTION });
        break;
    }
    const comments = await listQuery
      .orderBy('comment.commentedAt', 'DESC')
      .take(INBOX_LIMIT)
      .getMany();

    const items = comments.map((comment) => this.toItem(comment));
    const priority = items.filter((item) => item.needsResponse);
    const recent = items.filter((item) => !item.needsResponse);

    return {
      counts: {
        all: Number(raw?.total ?? 0),
        positive: Number(raw?.positive ?? 0),
        questions: Number(raw?.questions ?? 0),
        negative: Number(raw?.negative ?? 0),
      },
      needsResponse: priority.length,
      priority,
      recent,
      showing: items.length,
    };
  }

  async setResolved(id: string, userId: string, resolved: boolean) {
    await this.findOwned(id, userId);
    await this.commentRepository.update(id, { resolved });
    return await this.findDetail(id);
  }

  // Dialog "Reply dialog". Membalas otomatis menandai komentar selesai.
  async reply(id: string, userId: string, dto: ReplyCommentDto): Promise<CommentReply> {
    await this.findOwned(id, userId);

    // TODO: kirim balasan ke API platform lebih dulu, lalu isi platformReplyId dari hasilnya.
    const reply = await this.replyRepository.save(
      this.replyRepository.create({
        commentId: id,
        replyText: dto.replyText,
        repliedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    await this.commentRepository.update(id, { resolved: true });
    return reply;
  }

  // Analisis sentimen AI untuk satu komentar. Hasilnya menggantikan label sebelumnya
  // (comment_labels 1 : 1) dan prosesnya dicatat di ai_jobs.
  async analyze(id: string, userId: string) {
    const comment = await this.findOwned(id, userId);
    const brandId = comment.publishedPost.schedule.brandId;

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        brandId,
        jobType: AiJobType.SENTIMENT,
        status: AiJobStatus.PROCESSING,
        inputJson: { commentId: id },
        createdBy: userId,
        updatedBy: userId,
      }),
    );

    try {
      const result = await this.aiProvider.classifyComment(comment.message);
      const existing = await this.labelRepository.findOneBy({ commentId: id });
      const values = {
        label: result.label,
        confidence: result.confidence,
        modelName: result.model,
      };
      if (existing) {
        await this.labelRepository.update(existing.id, values);
      } else {
        await this.labelRepository.save(this.labelRepository.create({ commentId: id, ...values }));
      }
      await this.jobRepository.update(job.id, {
        status: AiJobStatus.COMPLETED,
        model: result.model,
        outputJson: { label: result.label, confidence: result.confidence },
      });
    } catch (error) {
      await this.jobRepository.update(job.id, {
        status: AiJobStatus.FAILED,
        outputJson: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw error;
    }
    return await this.findDetail(id);
  }

  // ---------- helper ----------

  private toItem(comment: Comment) {
    const label = comment.label ?? null;
    const needsResponse =
      !comment.resolved && !!label && NEEDS_RESPONSE_LABELS.includes(label.label);
    return {
      id: comment.id,
      authorName: comment.authorName,
      message: comment.message,
      commentedAt: comment.commentedAt,
      resolved: comment.resolved,
      needsResponse,
      platform: comment.publishedPost.schedule.socialAccount.platform,
      postTitle: comment.publishedPost.schedule.title,
      label: label ? { label: label.label, confidence: label.confidence } : null,
      replies: comment.replies ?? [],
    };
  }

  private async findDetail(id: string) {
    const comment = await this.commentRepository.findOneOrFail({
      where: { id },
      relations: {
        label: true,
        replies: true,
        publishedPost: { schedule: { socialAccount: true } },
      },
    });
    return this.toItem(comment);
  }

  private async findOwned(id: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository
      .createQueryBuilder('comment')
      .innerJoinAndSelect('comment.publishedPost', 'post')
      .innerJoinAndSelect('post.schedule', 'schedule')
      .innerJoin('schedule.brand', 'brand')
      .where('comment.id = :id', { id })
      .andWhere('brand.userId = :userId', { userId })
      .getOne();
    if (!comment) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }
    return comment;
  }
}
