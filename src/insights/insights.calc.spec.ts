import { describe, expect, it } from 'vitest';
import {
  bestPostTime,
  engagementRate,
  formatBestTime,
  latestPerPost,
  percentChange,
  seriesByDate,
  sumTotals,
} from './insights.calc.js';

const row = (publishedPostId: string, snapshotDate: string, reach: number, engagement: number) => ({
  publishedPostId,
  snapshotDate,
  reach,
  engagement,
});

describe('insights.calc', () => {
  it('menghitung engagement rate sebagai persen dari reach', () => {
    expect(engagementRate(83, 1000)).toBe(8.3);
    expect(engagementRate(10, 0)).toBe(0);
  });

  it('menghitung perubahan persen terhadap periode sebelumnya', () => {
    expect(percentChange(1124, 1000)).toBe(12.4);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(50, 0)).toBeNull();
  });

  it('memakai snapshot terbaru tiap posting, bukan menjumlahkan semua tanggal', () => {
    const latest = latestPerPost([
      row('a', '2026-10-20', 100, 10),
      row('a', '2026-10-22', 300, 30),
      row('a', '2026-10-21', 200, 20),
      row('b', '2026-10-21', 50, 5),
    ]);
    expect(latest).toHaveLength(2);
    expect(sumTotals(latest)).toEqual({
      reach: 350,
      engagements: 35,
      engagementRate: 10,
      postCount: 2,
      avgReachPerPost: 175,
    });
  });

  it('total kosong tidak menghasilkan NaN', () => {
    expect(sumTotals([])).toEqual({
      reach: 0,
      engagements: 0,
      engagementRate: 0,
      postCount: 0,
      avgReachPerPost: 0,
    });
  });

  it('grafik engagement rate per tanggal, terurut', () => {
    const series = seriesByDate([
      row('a', '2026-10-21', 100, 10),
      row('b', '2026-10-20', 50, 5),
      row('b', '2026-10-21', 200, 20),
    ]);
    expect(series).toEqual([
      { date: '2026-10-20', engagementRate: 10 },
      { date: '2026-10-21', engagementRate: 10 },
    ]);
  });

  it('memilih slot dengan rata-rata engagement tertinggi', () => {
    const slot = bestPostTime([
      { weekday: 5, hour: 9, rate: 0.1 },
      { weekday: 5, hour: 9, rate: 0.12 },
      { weekday: 2, hour: 20, rate: 0.2 },
      { weekday: 2, hour: 20, rate: 0.01 },
    ]);
    expect(slot).toEqual({ weekday: 5, hour: 9 });
    expect(bestPostTime([])).toBeNull();
  });

  it('memformat waktu terbaik seperti di UI', () => {
    expect(formatBestTime({ weekday: 5, hour: 9 })).toEqual({ weekday: 'Friday', label: '9:00 AM' });
    expect(formatBestTime({ weekday: 0, hour: 0 })).toEqual({ weekday: 'Sunday', label: '12:00 AM' });
    expect(formatBestTime({ weekday: 3, hour: 15 })).toEqual({ weekday: 'Wednesday', label: '3:00 PM' });
  });
});
