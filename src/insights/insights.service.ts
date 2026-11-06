import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity.js';
import { OverviewQueryDto } from './dto/insights-query.dto.js';
import {
  bestPostTime,
  formatBestTime,
  latestPerPost,
  percentChange,
  PostSample,
  seriesByDate,
  sumTotals,
} from './insights.calc.js';
import { DEFAULT_TIMEZONE } from '../common/constants.js';
import { Platform } from '../common/enums.js';
import { BrandsService } from '../brands/brands.service.js';
import {
  addDays,
  isValidTimeZone,
  toDateString,
  weekdayAndHourInTimeZone,
} from '../common/utils/date.js';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const;
const BEST_TIME_LOOKBACK_DAYS = 90;

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(AnalyticsSnapshot)
    private readonly snapshotRepository: Repository<AnalyticsSnapshot>,
    private readonly brandsService: BrandsService,
  ) {}

  // snapshot milik satu brand (snapshot -> published_post -> schedule -> social_account),
  // opsional dibatasi ke satu platform dan satu rentang tanggal.
  private brandSnapshots(
    brandId: string,
    from: string,
    to: string,
    platform?: Platform,
  ): SelectQueryBuilder<AnalyticsSnapshot> {
    const qb = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .innerJoinAndSelect('snapshot.publishedPost', 'post')
      .innerJoin('post.schedule', 'schedule')
      .innerJoin('schedule.socialAccount', 'account')
      .where('schedule.brandId = :brandId', { brandId })
      .andWhere('snapshot.snapshotDate BETWEEN :from AND :to', { from, to });
    if (platform) {
      qb.andWhere('account.platform = :platform', { platform });
    }
    return qb;
  }

  // Layar "Insights -> Overview"
  async overview(brandId: string, userId: string, query: OverviewQueryDto) {
    await this.brandsService.findOwned(brandId, userId);
    const timezone = query.timezone ?? DEFAULT_TIMEZONE;
    if (!isValidTimeZone(timezone)) {
      throw new BadRequestException(`Zona waktu "${timezone}" tidak valid`);
    }
    const range = query.range ?? '7d';
    const days = RANGE_DAYS[range];

    // periode sekarang = `days` hari terakhir termasuk hari ini; periode sebelumnya tepat sebelum itu
    const today = new Date();
    const currentFrom = toDateString(addDays(today, -(days - 1)));
    const previousFrom = toDateString(addDays(today, -(days * 2 - 1)));
    const currentTo = toDateString(today);

    const rows = await this.brandSnapshots(brandId, previousFrom, currentTo, query.platform).getMany();
    const flat = rows.map((row) => ({
      publishedPostId: row.publishedPostId,
      snapshotDate: row.snapshotDate,
      reach: row.reach,
      engagement: row.engagement,
    }));
    const current = flat.filter((row) => row.snapshotDate >= currentFrom);
    const previous = flat.filter((row) => row.snapshotDate < currentFrom);

    const currentTotals = sumTotals(latestPerPost(current));
    const previousTotals = sumTotals(latestPerPost(previous));

    return {
      range,
      platform: query.platform ?? 'all',
      timezone,
      totalReach: {
        value: currentTotals.reach,
        changePercent: percentChange(currentTotals.reach, previousTotals.reach),
      },
      engagementRate: {
        value: currentTotals.engagementRate,
        // selisih dalam "percentage point" (pp), mis. +0.6 pp
        changePoints: previousTotals.postCount
          ? Math.round((currentTotals.engagementRate - previousTotals.engagementRate) * 10) / 10
          : null,
      },
      postsTracked: {
        value: currentTotals.postCount,
        changePercent: percentChange(currentTotals.postCount, previousTotals.postCount),
      },
      avgReachPerPost: {
        value: currentTotals.avgReachPerPost,
        changePercent: percentChange(currentTotals.avgReachPerPost, previousTotals.avgReachPerPost),
      },
      bestPostTime: await this.bestTime(brandId, timezone, query.platform),
      // grafik "Engagement over time" (Rate %)
      series: seriesByDate(current),
    };
  }

  private async bestTime(brandId: string, timeZone: string, platform?: Platform) {
    const today = new Date();
    const rows = await this.brandSnapshots(
      brandId,
      toDateString(addDays(today, -BEST_TIME_LOOKBACK_DAYS)),
      toDateString(today),
      platform,
    ).getMany();

    // satu sampel per posting: snapshot terbarunya, di jam/hari saat posting tayang
    const samples: PostSample[] = latestPerPost(rows).map((snapshot) => {
      const { weekday, hour } = weekdayAndHourInTimeZone(snapshot.publishedPost.publishedAt, timeZone);
      return { weekday, hour, rate: snapshot.engagementRate };
    });

    const slot = bestPostTime(samples);
    return slot ? { ...formatBestTime(slot), timezone: timeZone } : null;
  }
}
