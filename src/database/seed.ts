// Data demo untuk development, meniru isi layar di Figma (Zahira, @naya.design, dst).
// Jalankan: npm run build && npm run seed   (butuh database aktif dan file .env)
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Brand } from '../brands/entities/brand.entity.js';
import { SocialAccount } from '../social-accounts/entities/social-account.entity.js';
import { CanvaAccount } from '../canva-accounts/entities/canva-account.entity.js';
import { OauthToken } from '../oauth-tokens/entities/oauth-token.entity.js';
import { MediaAsset } from '../media/entities/media-asset.entity.js';
import { Folder } from '../media/entities/folder.entity.js';
import { GeneratedCaption } from '../captions/entities/generated-caption.entity.js';
import { AiJob } from '../ai-jobs/entities/ai-job.entity.js';
import { PostSchedule } from '../post-schedules/entities/post-schedule.entity.js';
import { PostScheduleMedia } from '../post-schedules/entities/post-schedule-media.entity.js';
import { PublishedPost } from '../published-posts/entities/published-post.entity.js';
import { AnalyticsSnapshot } from '../insights/entities/analytics-snapshot.entity.js';
import { Comment } from '../comments/entities/comment.entity.js';
import { CommentLabel } from '../comments/entities/comment-label.entity.js';
import { CommentReply } from '../comments/entities/comment-reply.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity.js';
import { hashPassword } from '../common/utils/password.js';
import {
  AiJobStatus,
  AiJobType,
  CommentLabelType,
  MediaOrigin,
  OAuthProvider,
  Platform,
  PostScheduleStatus,
  PostType,
} from '../common/enums.js';
import { addDays, toDateString } from '../common/utils/date.js';

const DEMO_EMAIL = 'zahira@vibr.app';
const DEMO_PASSWORD = 'Password123'; // hanya untuk data demo lokal

// pseudo-random deterministik supaya angka demo selalu sama
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
      User, Brand, SocialAccount, CanvaAccount, OauthToken, MediaAsset, Folder, GeneratedCaption,
      AiJob, PostSchedule, PostScheduleMedia, PublishedPost, AnalyticsSnapshot, Comment,
      CommentLabel, CommentReply, Notification, ActivityLog,
    ],
    synchronize: true,
  });
  await dataSource.initialize();

  if (await dataSource.getRepository(User).existsBy({ email: DEMO_EMAIL })) {
    console.log(`Seed dilewati: ${DEMO_EMAIL} sudah ada.`);
    await dataSource.destroy();
    return;
  }

  await dataSource.transaction(async (m) => {
    const now = new Date();
    const random = rng(42);

    // ---- user, brand, akun ----
    const user = await m.save(
      m.create(User, {
        name: 'Zahira',
        email: DEMO_EMAIL,
        passwordHash: await hashPassword(DEMO_PASSWORD),
      }),
    );
    const brand = await m.save(
      m.create(Brand, {
        userId: user.id,
        name: 'Vibr Studio',
        description: 'Studio desain yang membantu brand kecil tampil segar di media sosial.',
        industry: 'Design',
        toneOfVoice: 'santai, ramah, sedikit humor',
        primaryColor: '#7C3AED',
        secondaryColor: '#34D399',
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );
    const [instagram, facebook] = await m.save([
      m.create(SocialAccount, {
        brandId: brand.id, platform: Platform.INSTAGRAM, accountName: '@vibr.studio',
        accountId: 'demo_ig_1', createdBy: user.id, updatedBy: user.id,
      }),
      m.create(SocialAccount, {
        brandId: brand.id, platform: Platform.FACEBOOK, accountName: 'Vibr Studio',
        accountId: 'demo_fb_1', createdBy: user.id, updatedBy: user.id,
      }),
    ]);
    const canva = await m.save(m.create(CanvaAccount, { userId: user.id, canvaUserId: 'demo_canva_1' }));
    await m.save([
      m.create(OauthToken, {
        provider: OAuthProvider.INSTAGRAM, ownerId: instagram.id,
        accessToken: 'demo-instagram-access-token', expiredAt: addDays(now, 60),
      }),
      m.create(OauthToken, {
        provider: OAuthProvider.FACEBOOK, ownerId: facebook.id,
        accessToken: 'demo-facebook-access-token', expiredAt: addDays(now, 60),
      }),
      m.create(OauthToken, {
        provider: OAuthProvider.CANVA, ownerId: canva.id,
        accessToken: 'demo-canva-access-token', refreshToken: 'demo-canva-refresh-token',
        expiredAt: addDays(now, 1),
      }),
    ]);

    // ---- library media ----
    const folder = await m.save(
      m.create(Folder, { brandId: brand.id, name: 'Campaign Oktober', createdBy: user.id, updatedBy: user.id }),
    );
    const asset = await m.save(
      m.create(MediaAsset, {
        brandId: brand.id,
        folderId: folder.id,
        origin: MediaOrigin.IMAGE_AI,
        storageKey: 'seed/violet-orbits.png',
        filename: 'violet-orbits.png',
        mimeType: 'image/png',
        size: 240_000,
        width: 1024,
        height: 1024,
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );
    await m.save(m.create(Brand, { ...brand, logoAssetId: asset.id }));
    await m.save(
      m.create(AiJob, {
        brandId: brand.id,
        jobType: AiJobType.GENERATE_IMAGE,
        model: 'flux-schnell',
        status: AiJobStatus.COMPLETED,
        inputJson: { prompt: 'Violet orbits with a mint spark', aspectRatio: '1:1' },
        outputJson: { mediaAssetId: asset.id },
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );
    const caption = await m.save(
      m.create(GeneratedCaption, {
        brandId: brand.id,
        prompt: 'Caption untuk gambar violet orbits',
        caption: 'Violet orbits. A mint spark. ✦',
        hashtags: ['FreshIdeas', 'Design'],
        llmModel: 'demo-llm',
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );

    // ---- jadwal hari ini (untuk "Today's schedule") ----
    for (const [offsetHours, account, title] of [
      [2, instagram, 'Violet orbits'],
      [5, facebook, 'Fresh ideas'],
    ] as const) {
      const schedule = await m.save(
        m.create(PostSchedule, {
          brandId: brand.id,
          socialAccountId: account.id,
          captionId: caption.id,
          title,
          postType: PostType.POST,
          status: PostScheduleStatus.SCHEDULED,
          scheduledAt: new Date(now.getTime() + offsetHours * 3600_000),
          createdBy: user.id,
          updatedBy: user.id,
        }),
      );
      await m.save(m.create(PostScheduleMedia, { scheduleId: schedule.id, mediaAssetId: asset.id, sortOrder: 0 }));
    }

    // ---- 20 posting yang sudah tayang + snapshot harian kumulatif (untuk Insights) ----
    const published: PublishedPost[] = [];
    const snapshots: AnalyticsSnapshot[] = [];
    for (let i = 1; i <= 20; i++) {
      const publishedAt = new Date(now.getTime() - i * 36 * 3600_000);
      const account = i % 2 === 0 ? instagram : facebook;
      const schedule = await m.save(
        m.create(PostSchedule, {
          brandId: brand.id,
          socialAccountId: account.id,
          captionId: caption.id,
          title: `Konten demo #${i}`,
          status: PostScheduleStatus.PUBLISHED,
          scheduledAt: publishedAt,
          publishedAt,
          createdBy: user.id,
          updatedBy: user.id,
        }),
      );
      await m.save(m.create(PostScheduleMedia, { scheduleId: schedule.id, mediaAssetId: asset.id, sortOrder: 0 }));
      const post = await m.save(
        m.create(PublishedPost, {
          scheduleId: schedule.id,
          platformPostId: `demo_${i}`,
          platformUrl: `https://example.com/demo/${i}`,
          publishedAt,
        }),
      );
      published.push(post);

      // angka akhir per posting, lalu dibagi ke snapshot harian (kumulatif, naik melandai)
      const finalReach = 800 + Math.floor(random() * 1200);
      const finalRate = 0.06 + random() * 0.06;
      const ageDays = Math.floor((now.getTime() - publishedAt.getTime()) / 86_400_000);
      for (let d = 0; d <= Math.min(ageDays, 7); d++) {
        const progress = 1 - Math.exp(-(d + 1) / 2);
        const reach = Math.round(finalReach * progress);
        const engagement = Math.round(reach * finalRate);
        const likes = Math.round(engagement * 0.7);
        const commentsCount = Math.round(engagement * 0.1);
        const shares = Math.round(engagement * 0.1);
        snapshots.push(
          m.create(AnalyticsSnapshot, {
            publishedPostId: post.id,
            snapshotDate: toDateString(addDays(publishedAt, d)),
            impressions: Math.round(reach * 1.3),
            reach,
            engagement,
            likes,
            comments: commentsCount,
            shares,
            saves: engagement - likes - commentsCount - shares,
            engagementRate: reach > 0 ? Math.round((engagement / reach) * 10000) / 100 : 0,
            avgReachPerPost: reach,
          }),
        );
      }
    }
    await m.save(snapshots, { chunk: 100 });

    // ---- komentar (sesuai layar Insights -> Comments) ----
    const target = published[0];
    const comment = (
      authorName: string,
      message: string,
      minutesAgo: number,
      resolved = false,
    ) =>
      m.create(Comment, {
        publishedPostId: target.id,
        platformCommentId: `c_${authorName}_${minutesAgo}`,
        authorName,
        message,
        commentedAt: new Date(now.getTime() - minutesAgo * 60_000),
        resolved,
      });
    const [question, complaint, compliment, unlabeled] = await m.save([
      comment('@naya.design', 'Could you share a carousel tutorial for this design?', 12),
      comment('@arif.studio', "The download link in your post isn't working for me.", 38),
      comment('@maya.creates', 'That mint spark is perfect. Such a beautiful composition!', 60, true),
      comment('@new.follower', 'Just found this page 👋', 5),
    ]);
    void unlabeled; // sengaja tanpa label: belum dianalisis AI
    await m.save([
      m.create(CommentLabel, { commentId: question.id, label: CommentLabelType.QUESTION, confidence: 0.94, modelName: 'demo-sentiment' }),
      m.create(CommentLabel, { commentId: complaint.id, label: CommentLabelType.NEGATIVE, confidence: 0.88, modelName: 'demo-sentiment' }),
      m.create(CommentLabel, { commentId: compliment.id, label: CommentLabelType.POSITIVE, confidence: 0.97, modelName: 'demo-sentiment' }),
    ]);
    await m.save(
      m.create(CommentReply, {
        commentId: compliment.id,
        replyText: 'Thank you! 💜',
        repliedAt: now,
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );

    // ---- notifikasi & audit log ----
    await m.save([
      m.create(Notification, {
        userId: user.id,
        title: 'Posting berhasil tayang',
        message: '"Konten demo #1" sudah tayang di facebook.',
      }),
      m.create(Notification, {
        userId: user.id,
        title: 'Komentar baru perlu dibalas',
        message: '@naya.design bertanya tentang tutorial carousel.',
      }),
    ]);
    await m.save([
      m.create(ActivityLog, { userId: user.id, action: 'create', entity: 'brands', entityId: brand.id, metadata: { name: brand.name } }),
      m.create(ActivityLog, { userId: user.id, action: 'connect', entity: 'social_accounts', entityId: instagram.id, metadata: { platform: 'instagram' } }),
    ]);
  });

  console.log(`Seed selesai. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await dataSource.destroy();
}

await main();
