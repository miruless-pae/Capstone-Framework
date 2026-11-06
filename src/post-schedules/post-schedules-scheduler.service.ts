import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { PostSchedulesService } from './post-schedules.service.js';

// Tanpa library tambahan: interval sederhana yang memeriksa jadwal jatuh tempo.
// Aman dijalankan di beberapa instance server sekaligus (lihat claim() di bawah).
@Injectable()
export class PostSchedulesSchedulerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PostSchedulesSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly postSchedulesService: PostSchedulesService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (!this.configService.get<boolean>('SCHEDULER_ENABLED')) {
      this.logger.log('Scheduler dimatikan (SCHEDULER_ENABLED=false)');
      return;
    }
    const interval = this.configService.get<number>('SCHEDULER_INTERVAL_MS') ?? 30_000;
    this.timer = setInterval(() => void this.runOnce(), interval);
    this.timer.unref(); // jangan menahan proses saat shutdown
    this.logger.log(`Scheduler aktif, memeriksa setiap ${interval} ms`);
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  // Satu putaran: claim jadwal jatuh tempo lalu publish satu per satu. Mengembalikan jumlah yang diproses.
  async runOnce(): Promise<number> {
    if (this.running) {
      return 0; // putaran sebelumnya belum selesai
    }
    this.running = true;
    try {
      const ids = await this.claim();
      for (const id of ids) {
        try {
          await this.postSchedulesService.publishClaimed(id);
          this.logger.log(`Jadwal ${id} diproses`);
        } catch (error) {
          this.logger.error(`Jadwal ${id} gagal diproses`, error as Error);
        }
      }
      return ids.length;
    } catch (error) {
      this.logger.error('Scheduler gagal mengambil jadwal', error as Error);
      return 0;
    } finally {
      this.running = false;
    }
  }

  // Claim atomik dalam SATU query: `FOR UPDATE SKIP LOCKED` membuat dua instance tidak pernah
  // mendapat jadwal yang sama. Selain yang jatuh tempo, ikut di-claim ulang jadwal yang macet di
  // "publishing" > 10 menit (server mati di tengah proses); publish bersifat idempotent
  // karena published_posts.schedule_id unik.
  private async claim(): Promise<string[]> {
    const batchSize = this.configService.get<number>('SCHEDULER_BATCH_SIZE') ?? 20;
    const result = await this.dataSource.query(
      `UPDATE post_schedules SET status = 'publishing', updated_at = now()
       WHERE id IN (
         SELECT id FROM post_schedules
         WHERE deleted_at IS NULL AND (
           (status = 'scheduled' AND scheduled_at <= now())
           OR (status = 'publishing' AND updated_at < now() - interval '10 minutes')
         )
         ORDER BY scheduled_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
      [batchSize],
    );
    // driver pg mengembalikan [baris, jumlah] untuk UPDATE ... RETURNING
    const rows: { id: string }[] = Array.isArray(result[0]) ? result[0] : result;
    return rows.map((row) => row.id);
  }
}
