# vibr-api

Backend untuk **vibr**, aplikasi mobile pembuat konten AI dan penjadwal posting media sosial (capstone).
NestJS + TypeORM + PostgreSQL, dengan pola yang sama seperti proyek `build-framework`
(modul per fitur, DTO + `class-validator`, interceptor response, Joi config, soft delete).

Struktur database dan ERD: [docs/DATABASE.md](docs/DATABASE.md).

## Tools Menjalankan Project 

Butuh Node.js 22+ dan Docker.

```bash
npm install
cp .env.example .env        # lalu ganti JWT_SECRET dan DB_PASSWORD
npm run db:up               # PostgreSQL di Docker
npm run build
npm run seed                # data demo (opsional)
npm run start:dev
```

API berjalan di `http://localhost:3000/api`. Login demo setelah seed: `zahira@vibr.app` / `Password123`.

Jika port 5432 sudah terpakai, ubah `DB_PORT` di `.env` (mis. `5433`); Docker dan aplikasi memakai nilai yang sama.

```bash
npm test          # unit test
npm run lint
```

## Format response

```json
{ "success": true, "statusCode": 200, "message": "Success", "data": { } }
{ "success": false, "statusCode": 400, "message": "Validation failed", "errors": ["..."] }
```

Semua endpoint butuh header `Authorization: Bearer <accessToken>` kecuali yang ditandai sebagai publik.

## Endpoint

| Layar Figma | Method & path |
|---|---|
| Sign Up / Sign In | `POST /auth/register` · `POST /auth/login` (publik) |
| Lupa password | `POST /auth/forgot-password` · `POST /auth/reset-password` (publik) |
| Profile | `GET` `PATCH` `DELETE /users/me` |
| Setup Brand | `POST /brands` · `GET /brands` · `GET` `PATCH` `DELETE /brands/:id` (logo: `PATCH` `logoAssetId`) |
| Hubungkan akun sosial | `GET` `POST /brands/:brandId/social-accounts` · `DELETE /social-accounts/:id` |
| Akun Canva | `GET` `POST /canva-accounts` · `DELETE /canva-accounts/:id` |
| Library media | `GET` `POST /brands/:brandId/media` (`?origin=image_ai&type=image&folderId=`) · `PATCH` `DELETE /media/:id` |
| Folder | `GET` `POST /brands/:brandId/folders` · `PATCH` `DELETE /folders/:id` |
| Home Dashboard | `GET /brands/:brandId/dashboard/home` |
| Create with AI | `POST /brands/:brandId/ai-jobs/generate-image` (202) · `POST /ai-jobs/:id/regenerate` (202) · `POST /brands/:brandId/ai-jobs/remove-background` (202) · `GET /ai-jobs/:id` (polling) · `GET /brands/:brandId/ai-jobs` |
| Caption | `POST /brands/:brandId/captions/generate` · `GET /brands/:brandId/captions` · `GET` `PATCH` `DELETE /captions/:id` |
| New Post | `POST /brands/:brandId/schedules` · `GET /brands/:brandId/schedules` · `GET` `PATCH` `DELETE /schedules/:id` |
| Schedule / Post now | `POST /schedules/:id/schedule` · `POST /schedules/:id/unschedule` · `POST /schedules/:id/publish-now` |
| Schedule Calendar | `GET /brands/:brandId/calendar?month=2026-10&timezone=Asia/Jakarta` |
| Posting yang sudah tayang | `GET /brands/:brandId/published-posts` · `GET /published-posts/:id` |
| Insights → Overview | `GET /brands/:brandId/insights/overview?range=7d\|30d\|90d&platform=instagram` |
| Insights → Comments | `GET /brands/:brandId/comments?filter=all\|positive\|questions\|negative` |
| Komentar | `POST /comments/:id/resolve` · `/reopen` · `/analyze` · `/replies` |
| Notifikasi | `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` · `DELETE /notifications/:id` |
| Audit log | `GET /activity-logs?entity=post_schedules` |
| Health check | `GET /health` (publik) |

Satu jadwal = satu akun sosial. Untuk tayang di Instagram dan Facebook sekaligus, buat dua jadwal.

Contoh membuat posting terjadwal (media didaftarkan dulu lewat `POST /brands/:brandId/media`):

```http
POST /api/brands/{brandId}/schedules
{ "socialAccountId": "…", "title": "Violet orbits", "postType": "post",
  "caption": "Violet orbits ✦", "mediaAssetIds": ["…"], "scheduledAt": "2026-10-27T02:00:00Z" }
```

Gunakan `captionId` (caption hasil AI yang tersimpan) sebagai ganti `caption` bila ingin memakai ulang caption.

## Upload file

API **tidak menerima file**. Client mengunggah ke object storage (S3/Cloudinary/dst), lalu mendaftarkan
metadatanya lewat `POST /brands/:brandId/media` (`storageKey`, `filename`, `mimeType`, `size`, …).
URL publik dibentuk dari `STORAGE_BASE_URL` + `storageKey`.

## Job penjadwal

[`PostSchedulesSchedulerService`](src/post-schedules/post-schedules-scheduler.service.ts) berjalan otomatis bersama server (tanpa library tambahan).
Tiap putaran ia mengambil jadwal berstatus `scheduled` yang `scheduled_at`-nya sudah lewat, lalu mem-publish ke akun sosialnya.

| Env | Default | Arti |
|---|---|---|
| `SCHEDULER_ENABLED` | `true` | `false` untuk mematikan job (mis. di instance khusus API) |
| `SCHEDULER_INTERVAL_MS` | `30000` | jeda antar pemeriksaan (minimal 1000) |
| `SCHEDULER_BATCH_SIZE` | `20` | maks. jadwal yang diambil per putaran |

Perilakunya:
- **Aman untuk banyak instance.** Jadwal diambil dengan satu query `UPDATE ... FOR UPDATE SKIP LOCKED`, jadi dua server tidak pernah memproses jadwal yang sama.
- **Hasil.** Berhasil: baris `published_posts` dibuat, status `published`, notifikasi "Posting berhasil tayang". Gagal: status `failed` dan notifikasi berisi alasannya.
- **Pulih dari crash.** Jadwal yang macet di `publishing` lebih dari 10 menit diambil ulang. Jika `published_posts` untuk jadwal itu sudah ada, ia hanya ditandai `published` (tidak dikirim dua kali).
- **Tidak ada retry otomatis** untuk jadwal `failed`; user mengulang lewat `POST /schedules/:id/publish-now`.
- Ketepatan waktu sebesar `SCHEDULER_INTERVAL_MS`: dengan default, posting bisa tayang hingga 30 detik setelah jadwal.

## Yang masih placeholder

Kerangka dan alurnya sudah jalan dan teruji, tetapi bagian yang berhubungan dengan layanan luar
masih memakai implementasi palsu. Tiap bagian punya satu titik pengganti:

| Bagian | Sekarang | Cara mengganti |
|---|---|---|
| Gambar, caption, sentimen AI | `MockAiProvider` (metadata gambar palsu, caption bertemplat, sentimen berbasis kata kunci) | Buat kelas turunan `AiProvider` untuk FLUX / SDXL / Pollinations / LLM, ganti `useClass` di `ai/ai-provider.module.ts`. Provider asli harus mengunggah hasil gambar ke storage lalu mengembalikan `storageKey` |
| Publish ke platform | `MockPlatformPublisher` (selalu berhasil) | Buat kelas turunan `PlatformPublisher` per platform, ganti `useClass` di `post-schedules.module.ts` |
| Upload file | API menerima metadata + `storageKey` hasil upload client | Hubungkan storage (S3/Cloudinary), atau tambahkan endpoint presigned URL / `multipart` |
| Sinkron komentar & statistik | Hanya dari seed | Job berkala yang menarik data dari API platform ke `comments` dan `analytics_snapshots` |
| Email reset password | Token dikembalikan di response (hanya non-production) | Kirim lewat layanan email |
| OAuth media sosial | `POST /brands/:brandId/social-accounts` menerima akun + token | Alur redirect/callback OAuth per platform |

## Sebelum production

- Ganti `synchronize: true` dengan migration TypeORM.
- Enkripsi `oauth_tokens.access_token` / `refresh_token` di level aplikasi.
- Tolak request dari akun `suspended` yang masih memegang JWT (saat ini hanya dicek saat login).
- Batasi `enableCors()` ke origin aplikasi, tambahkan rate limiting pada `/auth/*`.
- `JWT_SECRET` harus acak dan panjang (validasi Joi mensyaratkan minimal 32 karakter).
