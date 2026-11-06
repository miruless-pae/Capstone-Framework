import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { PostSchedule } from '../post-schedules/entities/post-schedule.entity.js';
import { Comment } from '../comments/entities/comment.entity.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { toScheduleBrief } from '../post-schedules/post-schedules.mapper.js';
import { AiJobType, CommentLabelType, PostScheduleStatus } from '../common/enums.js';
import { DEFAULT_TIMEZONE } from '../common/constants.js';
import { BrandsService } from '../brands/brands.service.js';
import { UsersService } from '../users/users.service.js';
import { addDays, dateKeyInTimeZone, isValidTimeZone } from '../common/utils/date.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PostSchedule)
    private readonly scheduleRepository: Repository<PostSchedule>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly brandsService: BrandsService,
    private readonly usersService: UsersService,
  ) {}

  // Layar "Home Dashboard": sapaan, 3 kartu statistik, "Today's schedule", dan "Tools Choices".
  async home(brandId: string, userId: string, query: DashboardQueryDto) {
    const brand = await this.brandsService.findOwned(brandId, userId);
    const user = await this.usersService.findById(userId);
    const timezone = query.timezone ?? DEFAULT_TIMEZONE;
    if (!isValidTimeZone(timezone)) {
      throw new BadRequestException(`Zona waktu "${timezone}" tidak valid`);
    }
    const now = new Date();
    const todayKey = dateKeyInTimeZone(now, timezone);

    const [scheduled, publishedThisWeek, needReply, nearby] = await Promise.all([
      this.scheduleRepository.count({ where: { brandId, status: PostScheduleStatus.SCHEDULED } }),
      this.scheduleRepository.count({
        where: {
          brandId,
          status: PostScheduleStatus.PUBLISHED,
          publishedAt: MoreThanOrEqual(addDays(now, -7)),
        },
      }),
      // perlu dibalas = belum selesai dan berlabel negative / question
      this.commentRepository
        .createQueryBuilder('comment')
        .innerJoin('comment.publishedPost', 'post')
        .innerJoin('post.schedule', 'schedule')
        .innerJoin('comment.label', 'label')
        .where('schedule.brandId = :brandId', { brandId })
        .andWhere('comment.resolved = false')
        .andWhere('label.label IN (:...labels)', {
          labels: [CommentLabelType.NEGATIVE, CommentLabelType.QUESTION],
        })
        .getCount(),
      // ambil +-1 hari lalu saring per tanggal lokal (beda zona waktu dengan UTC)
      this.scheduleRepository.find({
        where: {
          brandId,
          status: Not(PostScheduleStatus.DRAFT),
          scheduledAt: Between(addDays(now, -1), addDays(now, 2)),
        },
        relations: { socialAccount: true, caption: true, media: { mediaAsset: true } },
        order: { scheduledAt: 'ASC' },
      }),
    ]);

    const todaySchedule = nearby
      .filter((item) => dateKeyInTimeZone(item.scheduledAt!, timezone) === todayKey)
      .map(toScheduleBrief);

    const logo = brand.logoAsset;
    return {
      greeting: `Hi, ${user.name.split(' ')[0]}`,
      date: new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now),
      brand: { id: brand.id, name: brand.name, logoUrl: logo ? (logo.thumbnailUrl ?? logo.url) : null },
      stats: { scheduled, publishedThisWeek, needReply },
      todaySchedule,
      // "Tools Choices"
      tools: [AiJobType.GENERATE_IMAGE, AiJobType.REMOVE_BACKGROUND, AiJobType.CAPTION],
    };
  }
}
