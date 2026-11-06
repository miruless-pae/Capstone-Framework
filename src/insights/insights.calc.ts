// Perhitungan murni (tanpa database) untuk layar Insights -> Overview, dipisah supaya mudah diuji.
//
// analytics_snapshots bersifat KUMULATIF per posting: angka pada tanggal D adalah total posting
// itu sampai D. Maka "total periode" memakai snapshot terbaru tiap posting (latestPerPost),
// bukan penjumlahan semua snapshot.

export interface SnapshotRow {
  publishedPostId: string;
  snapshotDate: string; // YYYY-MM-DD
  reach: number;
  engagement: number;
}

export interface Totals {
  reach: number;
  engagements: number;
  engagementRate: number; // persen, mis. 8.3
  postCount: number;
  avgReachPerPost: number;
}

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

// engagement rate = total interaksi / total reach * 100
export function engagementRate(engagements: number, reach: number): number {
  return reach > 0 ? round((engagements / reach) * 100) : 0;
}

// Snapshot terbaru (tanggal terbesar) untuk setiap posting.
export function latestPerPost<T extends { publishedPostId: string; snapshotDate: string }>(
  rows: T[],
): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const current = latest.get(row.publishedPostId);
    if (!current || row.snapshotDate > current.snapshotDate) {
      latest.set(row.publishedPostId, row);
    }
  }
  return [...latest.values()];
}

// Jumlahkan snapshot terbaru tiap posting (masukkan hasil latestPerPost).
export function sumTotals(latestRows: SnapshotRow[]): Totals {
  const reach = latestRows.reduce((sum, row) => sum + row.reach, 0);
  const engagements = latestRows.reduce((sum, row) => sum + row.engagement, 0);
  const postCount = latestRows.length;
  return {
    reach,
    engagements,
    engagementRate: engagementRate(engagements, reach),
    postCount,
    avgReachPerPost: postCount > 0 ? round(reach / postCount) : 0,
  };
}

// perubahan persen terhadap periode sebelumnya ("↑ 12.4% vs prior 7D"); null jika tidak ada pembanding
export function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? round(((current - previous) / previous) * 100) : null;
}

// Grafik "Engagement over time": engagement rate per tanggal snapshot, dari semua posting pada tanggal itu.
export function seriesByDate(rows: SnapshotRow[]): { date: string; engagementRate: number }[] {
  const byDate = new Map<string, { reach: number; engagement: number }>();
  for (const row of rows) {
    const day = byDate.get(row.snapshotDate) ?? { reach: 0, engagement: 0 };
    day.reach += row.reach;
    day.engagement += row.engagement;
    byDate.set(row.snapshotDate, day);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({ date, engagementRate: engagementRate(day.engagement, day.reach) }));
}

export interface PostSample {
  weekday: number; // 0 = Minggu
  hour: number; // 0-23, di zona waktu tampilan
  rate: number; // engagement rate posting tersebut
}

// "Best post time": slot (hari + jam) dengan rata-rata engagement rate tertinggi.
export function bestPostTime(samples: PostSample[]): { weekday: number; hour: number } | null {
  const slots = new Map<string, { weekday: number; hour: number; total: number; count: number }>();
  for (const sample of samples) {
    const key = `${sample.weekday}-${sample.hour}`;
    const slot = slots.get(key) ?? { weekday: sample.weekday, hour: sample.hour, total: 0, count: 0 };
    slot.total += sample.rate;
    slot.count += 1;
    slots.set(key, slot);
  }

  let best: { weekday: number; hour: number; average: number } | null = null;
  for (const slot of slots.values()) {
    const average = slot.total / slot.count;
    if (!best || average > best.average) {
      best = { weekday: slot.weekday, hour: slot.hour, average };
    }
  }
  return best ? { weekday: best.weekday, hour: best.hour } : null;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatBestTime(slot: { weekday: number; hour: number }): {
  weekday: string;
  label: string;
} {
  const suffix = slot.hour >= 12 ? 'PM' : 'AM';
  const hour12 = slot.hour % 12 === 0 ? 12 : slot.hour % 12;
  return { weekday: WEEKDAYS[slot.weekday], label: `${hour12}:00 ${suffix}` };
}
