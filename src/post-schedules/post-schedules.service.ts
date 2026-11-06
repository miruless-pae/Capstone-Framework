import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { PostSchedule } from './entities/post-schedule.entity.js';
import { PostScheduleMedia } from './entities/post-schedule-media.entity.js';
import { SocialAccount } from '../social-accounts/entities/social-account.entity.js';
import { MediaAsset } from '../media/entities/media-asset.entity.js';
import { GeneratedCaption } from '../captions/entities/generated-caption.entity.js';
import { PublishedPost } from '../published-posts/entities/published-post.entity.js';
import {
  CalendarQueryDto,
  CreatePostScheduleDto,
  ListPostSchedulesQueryDto,
  SchedulePostDto,
  UpdatePostScheduleDto,
} from './dto/post-schedule.dto.js';
import { PlatformPublisher } from './publishers/platform-publisher.js';
import { toScheduleBrief } from './post-schedules.mapper.js';
import { PostScheduleStatus, SocialAccountStatus } from '../common/enums.js';
import { DEFAULT_TIMEZONE } from '../common/constants.js';
import { addDays, dateKeyInTimeZone, isValidTimeZone } from '../common/utils/date.js';
import { BrandsService } from '../brands/brands.service.js';
import { CaptionsService } from '../captions/captions.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';

const RELATIONS = {
  socialAccount: true,
  caption: true,
  media: { mediaAsset: true },
  publishedPost: true,
} as const;
const LOCKED_STATUSES = [PostScheduleStatus.PUBLISHING, PostScheduleStatus.PUBLISHED];

@Injectable()
export class PostSchedulesService {
  private readonly logger = new Logger(PostSchedulesService.name);

  constructor(
    @InjectRepository(PostSchedule)
    private readonly scheduleRepository: Repository<PostSchedule>,
    @InjectRepository(SocialAccount)
    private readonly accountRepository: Repository<SocialAccount>,
    @InjectRepository(MediaAsset)
    private readonly mediaRepository: Repository<MediaAsset>,
    @InjectRepository(PublishedPost)
    private readonly publishedRepository: Repository<PublishedPost>,
    private readonly dataSource: DataSource,
    private readonly brandsService: BrandsService,
    private readonly captionsService: CaptionsService,
    private readonly notifications: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
    private readonly publisher: PlatformPublisher,
  ) {}

  // ---------- baca ----------

  async findAll(brandId: string, userId: string, query: ListPostSchedulesQueryDto) {
    await this.brandsService.findOwned(brandId, userId);

    const where: FindOptionsWhere<PostSchedule> = { brandId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.from && query.to) {
      where.scheduledAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.scheduledAt = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.scheduledAt = LessThanOrEqual(new Date(query.to));
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.scheduleRepository.findAndCount({
      where,
      relations: RELATIONS,
      order: { scheduledAt: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: items.map((item) => this.withSortedMedia(item)), total, page, limit };
  }

  async findOwned(id: string, userId: string): Promise<PostSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, brand: { userId } },
      relations: RELATIONS,
    });
    if (!schedule) {
      throw new NotFoundException('Jadwal posting tidak ditemukan');
    }
    return this.withSortedMedia(schedule);
  }

  // Layar "Schedule Calendar" / "Calendar Empty": jadwal dikelompokkan per tanggal lokal.
  async calendar(brandId: string, userId: string, query: CalendarQueryDto) {
    await this.brandsService.findOwned(brandId, userId);
    const timezone = query.timezone ?? DEFAULT_TIMEZONE;
    if (!isValidTimeZone(timezone)) {
      throw new BadRequestException(`Zona waktu "${timezone}" tidak valid`);
    }

    // rentang diperlebar +-1 hari agar item di tepi bulan tidak hilang karena beda zona waktu
    const monthStart = new Date(`${query.month}-01T00:00:00Z`);
    const schedules = await this.scheduleRepository.find({
      where: { brandId, scheduledAt: Between(addDays(monthStart, -1), addDays(monthStart, 32)) },
      relations: RELATIONS,
      order: { scheduledAt: 'ASC' },
    });

    const byDate = new Map<string, ReturnType<typeof toScheduleBrief>[]>();
    for (const schedule of schedules) {
      const key = dateKeyInTimeZone(schedule.scheduledAt!, timezone);
      if (!key.startsWith(query.month)) {
        continue;
      }
      byDate.set(key, [...(byDate.get(key) ?? []), toScheduleBrief(this.withSortedMedia(schedule))]);
    }

    const days = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
    return { month: query.month, timezone, isEmpty: days.length === 0, days };
  }

  // ---------- tulis ----------

  async create(brandId: string, userId: string, dto: CreatePostScheduleDto): Promise<PostSchedule> {
    await this.brandsService.findOwned(brandId, userId);
    await this.assertAccount(brandId, dto.socialAccountId);
    await this.assertMedia(brandId, dto.mediaAssetIds);
    this.assertSingleCaptionSource(dto);
    const scheduledAt = this.parseSchedule(dto.scheduledAt);

    const id = await this.dataSource.transaction(async (manager) => {
      const captionId = await this.resolveCaption(brandId, userId, dto, manager);
      const schedule = await manager.save(
        manager.create(PostSchedule, {
          brandId,
          socialAccountId: dto.socialAccountId,
          captionId,
          title: dto.title,
          postType: dto.postType,
          scheduledAt,
          status: scheduledAt ? PostScheduleStatus.SCHEDULED : PostScheduleStatus.DRAFT,
          createdBy: userId,
          updatedBy: userId,
        }),
      );
      await this.attachMedia(manager, schedule.id, dto.mediaAssetIds ?? []);
      return schedule.id;
    });

    await this.activityLogs.log({
      userId,
      action: 'create',
      entity: 'post_schedules',
      entityId: id,
      metadata: { scheduledAt },
    });
    return await this.findOwned(id, userId);
  }

  async update(id: string, userId: string, dto: UpdatePostScheduleDto): Promise<PostSchedule> {
    const schedule = await this.findOwned(id, userId);
    this.assertEditable(schedule);
    if (dto.socialAccountId) await this.assertAccount(schedule.brandId, dto.socialAccountId);
    await this.assertMedia(schedule.brandId, dto.mediaAssetIds);
    this.assertSingleCaptionSource(dto);

    const patch: QueryDeepPartialEntity<PostSchedule> = { updatedBy: userId };
    if (dto.socialAccountId !== undefined) patch.socialAccountId = dto.socialAccountId;
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.postType !== undefined) patch.postType = dto.postType;
    if (dto.scheduledAt !== undefined) {
      patch.scheduledAt = this.parseSchedule(dto.scheduledAt);
      patch.status = PostScheduleStatus.SCHEDULED;
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.captionId !== undefined || dto.caption !== undefined) {
        patch.captionId = await this.resolveCaption(schedule.brandId, userId, dto, manager);
      }
      await manager.update(PostSchedule, id, patch);
      if (dto.mediaAssetIds) {
        // ganti seluruh daftar media
        await manager.softDelete(PostScheduleMedia, { scheduleId: id });
        await this.attachMedia(manager, id, dto.mediaAssetIds);
      }
    });
    await this.activityLogs.log({
      userId,
      action: 'update',
      entity: 'post_schedules',
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });
    return await this.findOwned(id, userId);
  }

  // Dialog "Schedule post confirmation"
  async schedule(id: string, userId: string, dto: SchedulePostDto): Promise<PostSchedule> {
    const schedule = await this.findOwned(id, userId);
    this.assertEditable(schedule);
    await this.scheduleRepository.update(id, {
      scheduledAt: this.parseSchedule(dto.scheduledAt),
      status: PostScheduleStatus.SCHEDULED,
      updatedBy: userId,
    });
    await this.activityLogs.log({
      userId,
      action: 'schedule',
      entity: 'post_schedules',
      entityId: id,
      metadata: { scheduledAt: dto.scheduledAt },
    });
    return await this.findOwned(id, userId);
  }

  async unschedule(id: string, userId: string): Promise<PostSchedule> {
    const schedule = await this.findOwned(id, userId);
    this.assertEditable(schedule);
    await this.scheduleRepository.update(id, {
      scheduledAt: null,
      status: PostScheduleStatus.DRAFT,
      updatedBy: userId,
    });
    return await this.findOwned(id, userId);
  }

  // Dialog "Post now confirmation". Jadwal berstatus failed boleh dicoba lagi.
  async publishNow(id: string, userId: string): Promise<PostSchedule> {
    const schedule = await this.findOwned(id, userId);
    this.assertEditable(schedule);
    await this.scheduleRepository.update(id, {
      status: PostScheduleStatus.PUBLISHING,
      updatedBy: userId,
    });
    await this.runPublish(id);
    return await this.findOwned(id, userId);
  }

  // Dipanggil PostSchedulesSchedulerService setelah jadwal berhasil di-claim (status sudah "publishing").
  async publishClaimed(id: string): Promise<void> {
    await this.runPublish(id);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.findOwned(id, userId);
    await this.scheduleRepository.update(id, { updatedBy: userId });
    await this.scheduleRepository.softDelete(id);
    await this.activityLogs.log({ userId, action: 'delete', entity: 'post_schedules', entityId: id });
    return { message: 'Jadwal posting dihapus' };
  }

  // ---------- publish ----------

  // Hasil sukses -> baris published_posts + status published. Gagal -> status failed dan
  // notifikasi ke pemilik brand berisi alasannya.
  private async runPublish(id: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: { ...RELATIONS, brand: true },
    });
    if (!schedule) {
      return;
    }
    const ownerId = schedule.brand.userId;

    // idempotent: jika crash terjadi setelah platform menerima posting, jangan kirim dua kali
    if (await this.publishedRepository.existsBy({ scheduleId: id })) {
      await this.scheduleRepository.update(id, { status: PostScheduleStatus.PUBLISHED });
      return;
    }

    try {
      const result = await this.publisher.publish(this.withSortedMedia(schedule));
      const publishedAt = new Date();
      await this.dataSource.transaction(async (manager) => {
        await manager.save(
          manager.create(PublishedPost, {
            scheduleId: id,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
            publishedAt,
          }),
        );
        await manager.update(PostSchedule, id, {
          status: PostScheduleStatus.PUBLISHED,
          publishedAt,
        });
      });
      await this.notifications.notify(
        ownerId,
        'Posting berhasil tayang',
        `"${schedule.title}" sudah tayang di ${schedule.socialAccount.platform}.`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Publish jadwal ${id} gagal: ${reason}`);
      await this.scheduleRepository.update(id, { status: PostScheduleStatus.FAILED });
      await this.notifications.notify(
        ownerId,
        'Posting gagal tayang',
        `"${schedule.title}" gagal tayang di ${schedule.socialAccount.platform}: ${reason}`,
      );
    }
  }

  // ---------- helper ----------

  private withSortedMedia(schedule: PostSchedule): PostSchedule {
    schedule.media = (schedule.media ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    return schedule;
  }

  private assertEditable(schedule: PostSchedule): void {
    if (LOCKED_STATUSES.includes(schedule.status)) {
      throw new ConflictException(`Jadwal berstatus "${schedule.status}" tidak dapat diubah`);
    }
  }

  private parseSchedule(value?: string): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('Waktu jadwal harus di masa depan');
    }
    return date;
  }

  private assertSingleCaptionSource(dto: { captionId?: string; caption?: string }): void {
    if (dto.captionId && dto.caption) {
      throw new BadRequestException('Isi captionId atau caption, tidak keduanya');
    }
  }

  // Mengembalikan caption_id yang dipakai: caption yang sudah ada, atau caption manual baru.
  private async resolveCaption(
    brandId: string,
    userId: string,
    dto: { captionId?: string; caption?: string },
    manager: EntityManager,
  ): Promise<string | null> {
    if (dto.captionId) {
      const exists = await manager.existsBy(GeneratedCaption, { id: dto.captionId, brandId });
      if (!exists) {
        throw new NotFoundException('Caption tidak ditemukan di brand ini');
      }
      return dto.captionId;
    }
    if (dto.caption) {
      return (await this.captionsService.createManual(brandId, userId, dto.caption, manager)).id;
    }
    return null;
  }

  private async attachMedia(manager: EntityManager, scheduleId: string, mediaAssetIds: string[]) {
    if (mediaAssetIds.length === 0) {
      return;
    }
    await manager.save(
      mediaAssetIds.map((mediaAssetId, index) =>
        manager.create(PostScheduleMedia, { scheduleId, mediaAssetId, sortOrder: index }),
      ),
    );
  }

  private async assertAccount(brandId: string, socialAccountId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: socialAccountId, brandId },
    });
    if (!account) {
      throw new NotFoundException('Akun sosial tidak ditemukan di brand ini');
    }
    if (account.status !== SocialAccountStatus.CONNECTED) {
      throw new BadRequestException(`Akun ${account.accountName} belum terhubung (${account.status})`);
    }
  }

  private async assertMedia(brandId: string, mediaAssetIds?: string[]): Promise<void> {
    if (!mediaAssetIds?.length) {
      return;
    }
    const found = await this.mediaRepository.countBy({ id: In(mediaAssetIds), brandId });
    if (found !== mediaAssetIds.length) {
      throw new NotFoundException('Ada media yang tidak ditemukan di brand ini');
    }
  }
}
