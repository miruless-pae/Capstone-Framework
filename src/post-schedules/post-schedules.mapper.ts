import { PostSchedule } from './entities/post-schedule.entity.js';

// Media berurutan menurut sort_order (relasi OneToMany tidak menjamin urutan).
export function sortedMedia(schedule: PostSchedule) {
  return [...(schedule.media ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.mediaAsset)
    .filter(Boolean);
}

// Ringkasan untuk kartu kalender / "Today's schedule" (bukan detail penuh).
export function toScheduleBrief(schedule: PostSchedule) {
  const [cover] = sortedMedia(schedule);
  return {
    id: schedule.id,
    title: schedule.title,
    postType: schedule.postType,
    status: schedule.status,
    scheduledAt: schedule.scheduledAt,
    publishedAt: schedule.publishedAt,
    caption: schedule.caption?.caption ?? null,
    thumbnailUrl: cover?.thumbnailUrl ?? cover?.url ?? null,
    platform: schedule.socialAccount?.platform ?? null,
    accountName: schedule.socialAccount?.accountName ?? null,
  };
}
