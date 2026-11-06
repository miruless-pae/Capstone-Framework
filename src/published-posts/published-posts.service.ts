import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { PublishedPost } from './entities/published-post.entity.js';
import { AnalyticsSnapshot } from '../insights/entities/analytics-snapshot.entity.js';
import { ListPublishedPostsQueryDto } from './dto/published-post.dto.js';
import { toScheduleBrief } from '../post-schedules/post-schedules.mapper.js';
import { BrandsService } from '../brands/brands.service.js';

const RELATIONS = {
  schedule: { socialAccount: true, caption: true, media: { mediaAsset: true } },
} as const;

@Injectable()
export class PublishedPostsService {
  constructor(
    @InjectRepository(PublishedPost)
    private readonly publishedRepository: Repository<PublishedPost>,
    @InjectRepository(AnalyticsSnapshot)
    private readonly snapshotRepository: Repository<AnalyticsSnapshot>,
    private readonly brandsService: BrandsService,
  ) {}

  // Daftar posting yang sudah tayang, masing-masing dengan snapshot statistik terbarunya.
  async findAll(brandId: string, userId: string, query: ListPublishedPostsQueryDto) {
    await this.brandsService.findOwned(brandId, userId);

    const where: FindOptionsWhere<PublishedPost> = {
      schedule: { brandId, ...(query.platform ? { socialAccount: { platform: query.platform } } : {}) },
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [posts, total] = await this.publishedRepository.findAndCount({
      where,
      relations: RELATIONS,
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const latest = await this.latestSnapshots(posts.map((post) => post.id));
    const items = posts.map((post) => ({
      id: post.id,
      platformPostId: post.platformPostId,
      platformUrl: post.platformUrl,
      publishedAt: post.publishedAt,
      schedule: toScheduleBrief(post.schedule),
      latestSnapshot: latest.get(post.id) ?? null,
    }));
    return { items, total, page, limit };
  }

  // Detail satu posting beserta seluruh riwayat snapshot (untuk grafik performa).
  async findOne(id: string, userId: string) {
    const post = await this.publishedRepository.findOne({
      where: { id, schedule: { brand: { userId } } },
      relations: RELATIONS,
    });
    if (!post) {
      throw new NotFoundException('Posting tidak ditemukan');
    }
    const snapshots = await this.snapshotRepository.find({
      where: { publishedPostId: id },
      order: { snapshotDate: 'ASC' },
    });
    return {
      id: post.id,
      platformPostId: post.platformPostId,
      platformUrl: post.platformUrl,
      publishedAt: post.publishedAt,
      schedule: toScheduleBrief(post.schedule),
      snapshots,
    };
  }

  private async latestSnapshots(postIds: string[]): Promise<Map<string, AnalyticsSnapshot>> {
    const latest = new Map<string, AnalyticsSnapshot>();
    if (postIds.length === 0) {
      return latest;
    }
    const snapshots = await this.snapshotRepository.find({
      where: { publishedPostId: In(postIds) },
      order: { snapshotDate: 'DESC' },
    });
    for (const snapshot of snapshots) {
      if (!latest.has(snapshot.publishedPostId)) {
        latest.set(snapshot.publishedPostId, snapshot);
      }
    }
    return latest;
  }
}
