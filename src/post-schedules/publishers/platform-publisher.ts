import { PostSchedule } from '../entities/post-schedule.entity.js';

export interface PublishResult {
  platformPostId: string;
  platformUrl: string | null;
}

// Titik sambung ke API tiap platform (Instagram Graph API, Facebook, Threads).
// `schedule` datang dengan socialAccount, caption, dan media (urut) sudah dimuat.
// Implementasi nyata mengambil token lewat OauthTokensService.find(provider, socialAccount.id)
// dan melempar error jika gagal; PostSchedulesService mengubahnya menjadi status `failed`
// + notifikasi untuk user.
export abstract class PlatformPublisher {
  abstract publish(schedule: PostSchedule): Promise<PublishResult>;
}
