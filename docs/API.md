# Panduan Tes API vibr (Postman)

Semua endpoint, lengkap dengan contoh body, bisa langsung ditempel ke Postman.

## Persiapan

1. Jalankan database dan API:
   ```bash
   npm run db:up
   npm run build
   npm run seed        # data demo (opsional, tapi disarankan)
   npm run start:dev
   ```
2. Buat **Environment** di Postman dengan variabel:

   | Variabel | Nilai awal |
   |---|---|
   | `baseUrl` | `http://localhost:3100/api` (sesuai `PORT` di `.env`) |
   | `token` | kosong, diisi setelah login |
   | `brandId`, `socialAccountId`, `mediaId`, `folderId`, `captionId`, `scheduleId`, `publishedPostId`, `commentId`, `aiJobId`, `canvaAccountId`, `notificationId` | kosong, diisi dari response |

3. Untuk semua request **selain yang ditandai publik**, tambahkan header
   `Authorization: Bearer {{token}}`. Cara mudah: tab **Authorization** di collection → Type *Bearer Token* → `{{token}}`.
4. Request `POST` / `PATCH` memakai header `Content-Type: application/json` (Body → raw → JSON).

**Tips otomatisasi.** Di tab *Tests* request login, tempel agar token tersimpan otomatis:

```javascript
const res = pm.response.json();
pm.environment.set("token", res.data.accessToken);
```

Cara yang sama untuk ID lain, mis. di request "Buat brand": `pm.environment.set("brandId", pm.response.json().data.id);`

## Format response

```json
{ "success": true,  "statusCode": 200, "message": "Success", "data": { } }
{ "success": false, "statusCode": 400, "message": "Validation failed", "errors": ["..."] }
```

Kode yang umum: `200` OK, `201` dibuat, `202` diterima dan diproses di latar belakang (AI job),
`400` validasi gagal, `401` token salah/tidak ada, `404` tidak ditemukan atau milik user lain,
`409` konflik (duplikat / status tidak boleh diubah).

## Urutan tes yang disarankan

Login → Buat brand → Hubungkan akun sosial → Daftarkan media → (Generate caption) → Buat jadwal →
Publish now → Lihat kalender / published posts / insights → komentar → notifikasi.

Login demo setelah seed: `zahira@vibr.app` / `Password123`. Seed sudah mengisi brand "Vibr Studio", 2 akun
(Instagram, Facebook), 22 jadwal, 20 posting tayang beserta statistiknya, dan 4 komentar. Ambil `brandId` dari
`GET /brands`.

---

## 1. Health

### GET `{{baseUrl}}/health` (publik)
Tanpa body.

---

## 2. Auth (semua publik)

### POST `{{baseUrl}}/auth/register`
```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Password123"
}
```
Password 8–72 karakter. Email yang sudah terdaftar (termasuk akun yang dihapus) → `409`.
Response berisi `accessToken` dan `user`.

### POST `{{baseUrl}}/auth/login`
```json
{
  "email": "zahira@vibr.app",
  "password": "Password123"
}
```
Salah email/password → `401`. Akun `suspended` → `403`.

### POST `{{baseUrl}}/auth/forgot-password`
```json
{ "email": "zahira@vibr.app" }
```
Selain production, response menyertakan `resetToken` (belum ada layanan email).

### POST `{{baseUrl}}/auth/reset-password`
```json
{
  "token": "<resetToken dari forgot-password>",
  "password": "PasswordBaru123"
}
```
Token berlaku 15 menit.

---

## 3. Profil (`/users`)

### GET `{{baseUrl}}/users/me`
Tanpa body.

### PATCH `{{baseUrl}}/users/me`
```json
{
  "name": "Zahira Putri",
  "avatarUrl": "https://example.com/avatar.png"
}
```
Semua field opsional.

### DELETE `{{baseUrl}}/users/me`
Soft delete akun. Tanpa body.

---

## 4. Brand

### POST `{{baseUrl}}/brands`
```json
{
  "name": "Kopi Senja",
  "description": "Kedai kopi lokal dengan suasana hangat.",
  "industry": "Food & Beverage",
  "toneOfVoice": "santai, ramah, sedikit humor",
  "primaryColor": "#7C3AED",
  "secondaryColor": "#34D399"
}
```
Hanya `name` yang wajib. Warna harus format `#RRGGBB`. Simpan `data.id` sebagai `brandId`.

### GET `{{baseUrl}}/brands`
Daftar brand milik user (beserta akun sosial dan logo).

### GET `{{baseUrl}}/brands/{{brandId}}`

### PATCH `{{baseUrl}}/brands/{{brandId}}`
```json
{
  "name": "Kopi Senja Official",
  "toneOfVoice": "profesional",
  "primaryColor": "#112233",
  "logoAssetId": "{{mediaId}}"
}
```
Semua opsional. `logoAssetId` harus media milik brand ini, jadi: buat brand → daftarkan media (bagian 7) → PATCH.

### DELETE `{{baseUrl}}/brands/{{brandId}}`

---

## 5. Akun sosial

### GET `{{baseUrl}}/brands/{{brandId}}/social-accounts`

### POST `{{baseUrl}}/brands/{{brandId}}/social-accounts`
```json
{
  "platform": "instagram",
  "accountName": "@kopisenja",
  "accountId": "17841400000000001",
  "accessToken": "token-akses-dari-oauth",
  "refreshToken": "token-refresh-dari-oauth",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```
`platform`: `facebook` | `instagram` | `threads`. `refreshToken` dan `expiresAt` opsional.
Akun yang sama (platform + accountId) dikirim lagi = reconnect (token diperbarui). Token tersimpan di
`oauth_tokens` dan tidak pernah muncul di response. Simpan `data.id` sebagai `socialAccountId`.

### DELETE `{{baseUrl}}/social-accounts/{{socialAccountId}}`
Memutuskan akun dan menghapus tokennya.

---

## 6. Akun Canva (milik user)

### GET `{{baseUrl}}/canva-accounts`

### POST `{{baseUrl}}/canva-accounts`
```json
{
  "canvaUserId": "canva-user-123",
  "accessToken": "token-akses-canva",
  "refreshToken": "token-refresh-canva",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

### DELETE `{{baseUrl}}/canva-accounts/{{canvaAccountId}}`

---

## 7. Library media

API tidak menerima file. Upload ke storage dulu, lalu daftarkan metadatanya di sini.

### POST `{{baseUrl}}/brands/{{brandId}}/media`
```json
{
  "storageKey": "brands/kopi-senja/2026/11/latte.png",
  "filename": "latte.png",
  "mimeType": "image/png",
  "size": 245000,
  "type": "image",
  "origin": "gallery",
  "folderId": "{{folderId}}",
  "width": 1080,
  "height": 1080,
  "thumbnail": "brands/kopi-senja/2026/11/latte-thumb.png"
}
```
Wajib: `storageKey`, `filename`, `mimeType`, `size` (byte). Lainnya opsional.
`type`: `image` | `video` (otomatis dari `mimeType` bila kosong). `origin`: `gallery` | `image_ai` | `canva` | `background_removal`.
Untuk video tambahkan `"duration": 15` (detik). Gambar maksimal 10 MB (`10485760`), lebih → `400`.
Response berisi `url` dan `thumbnailUrl` (dari `STORAGE_BASE_URL` + key). Simpan `data.id` sebagai `mediaId`.

Contoh video:
```json
{
  "storageKey": "brands/kopi-senja/2026/11/reel.mp4",
  "filename": "reel.mp4",
  "mimeType": "video/mp4",
  "size": 8400000,
  "width": 1080,
  "height": 1920,
  "duration": 15
}
```

### GET `{{baseUrl}}/brands/{{brandId}}/media`
Query opsional: `?origin=image_ai&type=image&folderId={{folderId}}`

### PATCH `{{baseUrl}}/media/{{mediaId}}`  (pindah folder)
```json
{ "folderId": "{{folderId}}" }
```
Keluarkan dari folder: `{ "folderId": null }`.

### DELETE `{{baseUrl}}/media/{{mediaId}}`

---

## 8. Folder

### GET `{{baseUrl}}/brands/{{brandId}}/folders`

### POST `{{baseUrl}}/brands/{{brandId}}/folders`
```json
{ "name": "Campaign Oktober" }
```
Nama kembar dalam satu brand → `409`. Simpan `data.id` sebagai `folderId`.

### PATCH `{{baseUrl}}/folders/{{folderId}}`
```json
{ "name": "Campaign November" }
```

### DELETE `{{baseUrl}}/folders/{{folderId}}`
Folder dihapus, media di dalamnya tetap ada tanpa folder.

---

## 9. Dashboard

### GET `{{baseUrl}}/brands/{{brandId}}/dashboard/home`
Query opsional: `?timezone=Asia/Jakarta`. Berisi sapaan, statistik (terjadwal, tayang minggu ini, perlu dibalas),
jadwal hari ini, dan daftar tools.

---

## 10. AI jobs (gambar)

Semua endpoint pembuat job menjawab **`202`** dengan job berstatus `pending`; proses jalan di latar belakang.
Polling `GET /ai-jobs/{{aiJobId}}` sampai `status` = `completed` atau `failed`.
(Provider AI saat ini masih mock: gambar hasilnya hanya metadata, filenya tidak benar-benar ada.)

### POST `{{baseUrl}}/brands/{{brandId}}/ai-jobs/generate-image`
```json
{
  "prompt": "Secangkir latte dengan latar ungu pastel, gaya minimalis",
  "model": "flux-schnell",
  "style": "minimal",
  "aspectRatio": "1:1",
  "referenceAssetId": "{{mediaId}}"
}
```
Hanya `prompt` yang wajib. `model`: `flux-schnell` | `sdxl` | `pollinations`.
`style`: `realistic` | `illustration` | `minimal` | `vibrant`. `aspectRatio`: `1:1` | `4:5` | `9:16`.
`referenceAssetId` = media milik brand. Simpan `data.id` sebagai `aiJobId`.

### GET `{{baseUrl}}/ai-jobs/{{aiJobId}}`
Setelah `completed`, response menyertakan `resultAsset` (media hasil, `origin: image_ai`) dan
`outputJson.mediaAssetId`. Jika `failed`, alasannya di `outputJson.error`.

### POST `{{baseUrl}}/ai-jobs/{{aiJobId}}/regenerate`
Tanpa body. Membuat job baru (`regenerate_image`) dengan parameter yang sama.

### POST `{{baseUrl}}/brands/{{brandId}}/ai-jobs/remove-background`
```json
{ "mediaAssetId": "{{mediaId}}" }
```
Hasilnya media baru dengan `origin: background_removal`.

### GET `{{baseUrl}}/brands/{{brandId}}/ai-jobs`
Query opsional: `?jobType=generate_image`
(`generate_image` | `regenerate_image` | `remove_background` | `caption` | `sentiment`).

---

## 11. Caption

### POST `{{baseUrl}}/brands/{{brandId}}/captions/generate`
```json
{ "prompt": "Promo kopi susu gula aren, beli 2 gratis 1 akhir pekan ini" }
```
Hasil disimpan dan tercatat di AI jobs. Simpan `data.id` sebagai `captionId`.

### GET `{{baseUrl}}/brands/{{brandId}}/captions`

### GET `{{baseUrl}}/captions/{{captionId}}`

### PATCH `{{baseUrl}}/captions/{{captionId}}`
```json
{
  "caption": "Weekend jadi lebih manis. Beli 2 gratis 1!",
  "hashtags": ["KopiSenja", "PromoAkhirPekan"]
}
```
Hashtag tanpa tanda `#`. Caption maks. 2200 karakter.

### DELETE `{{baseUrl}}/captions/{{captionId}}`

---

## 12. Jadwal posting (`/schedules`)

Satu jadwal = satu akun sosial. Untuk Instagram **dan** Facebook buat dua jadwal.

### POST `{{baseUrl}}/brands/{{brandId}}/schedules`
Draft dengan caption manual dan dua media (urutan array = urutan tampil):
```json
{
  "socialAccountId": "{{socialAccountId}}",
  "title": "Promo akhir pekan",
  "postType": "post",
  "caption": "Weekend jadi lebih manis ☕",
  "mediaAssetIds": ["{{mediaId}}"]
}
```
Terjadwal dengan caption AI yang tersimpan (isi `captionId` **atau** `caption`, tidak keduanya):
```json
{
  "socialAccountId": "{{socialAccountId}}",
  "title": "Promo akhir pekan",
  "postType": "reel",
  "captionId": "{{captionId}}",
  "mediaAssetIds": ["{{mediaId}}"],
  "scheduledAt": "2026-12-01T02:00:00Z"
}
```
Wajib: `socialAccountId`, `title`. `postType`: `post` | `story` | `reel`. Maks. 10 media.
Dengan `scheduledAt` (harus di masa depan) status `scheduled`; tanpa itu `draft`.
Akun harus berstatus `connected` dan milik brand ini. Simpan `data.id` sebagai `scheduleId`.

### GET `{{baseUrl}}/brands/{{brandId}}/schedules`
Query opsional: `?status=scheduled&from=2026-11-01T00:00:00Z&to=2026-11-30T23:59:59Z&page=1&limit=20`
(`status`: `draft` | `scheduled` | `publishing` | `published` | `failed`).

### GET `{{baseUrl}}/schedules/{{scheduleId}}`

### PATCH `{{baseUrl}}/schedules/{{scheduleId}}`
```json
{
  "title": "Promo akhir pekan (revisi)",
  "caption": "Caption baru",
  "mediaAssetIds": ["{{mediaId}}"],
  "scheduledAt": "2026-12-02T03:00:00Z"
}
```
Semua opsional; `mediaAssetIds` mengganti seluruh daftar media. Jadwal berstatus `publishing`/`published` → `409`.

### POST `{{baseUrl}}/schedules/{{scheduleId}}/schedule`
```json
{ "scheduledAt": "2026-12-01T02:00:00Z" }
```

### POST `{{baseUrl}}/schedules/{{scheduleId}}/unschedule`
Tanpa body. Kembali ke `draft`.

### POST `{{baseUrl}}/schedules/{{scheduleId}}/publish-now`
Tanpa body. Dengan publisher mock langsung berstatus `published`, baris `published_posts` terbuat, dan
notifikasi terkirim. Jadwal `failed` boleh dicoba lagi.

### DELETE `{{baseUrl}}/schedules/{{scheduleId}}`

### GET `{{baseUrl}}/brands/{{brandId}}/calendar?month=2026-11`
Query: `month` wajib (`YYYY-MM`), `timezone` opsional (default `Asia/Jakarta`).
Jadwal dikelompokkan per tanggal lokal.

---

## 13. Posting yang sudah tayang

### GET `{{baseUrl}}/brands/{{brandId}}/published-posts`
Query opsional: `?platform=instagram&page=1&limit=20`. Tiap item membawa snapshot statistik terbaru.

### GET `{{baseUrl}}/published-posts/{{publishedPostId}}`
Detail beserta seluruh riwayat snapshot (untuk grafik). Ambil `publishedPostId` dari list di atas.

---

## 14. Insights

### GET `{{baseUrl}}/brands/{{brandId}}/insights/overview`
Query opsional: `?range=30d&platform=instagram&timezone=Asia/Jakarta`
(`range`: `7d` | `30d` | `90d`, default `7d`).
Berisi total reach, engagement rate, jumlah posting terlacak, rata-rata reach per posting, best post time,
dan grafik engagement. Persentase perubahan `null` bila periode sebelumnya kosong.

---

## 15. Komentar

### GET `{{baseUrl}}/brands/{{brandId}}/comments`
Query opsional: `?filter=questions&from=2026-11-01T00:00:00Z&to=2026-11-30T23:59:59Z`
(`filter`: `all` | `positive` | `questions` | `negative`).
Berisi `counts`, `priority` (belum selesai dan berlabel negative/question), dan `recent`.
Simpan salah satu `id` sebagai `commentId`.

### POST `{{baseUrl}}/comments/{{commentId}}/analyze`
Tanpa body. Analisis sentimen AI; membuat/memperbarui label (`positive` | `negative` | `question`).

### POST `{{baseUrl}}/comments/{{commentId}}/replies`
```json
{ "replyText": "Terima kasih! Tutorialnya segera kami buat 💜" }
```
Membalas otomatis menandai komentar selesai.

### POST `{{baseUrl}}/comments/{{commentId}}/resolve`
Tanpa body.

### POST `{{baseUrl}}/comments/{{commentId}}/reopen`
Tanpa body.

---

## 16. Notifikasi

### GET `{{baseUrl}}/notifications`
Query opsional: `?unreadOnly=true&page=1&limit=20`. Response menyertakan jumlah `unread`.

### POST `{{baseUrl}}/notifications/{{notificationId}}/read`
Tanpa body.

### POST `{{baseUrl}}/notifications/read-all`
Tanpa body.

### DELETE `{{baseUrl}}/notifications/{{notificationId}}`

---

## 17. Audit log

### GET `{{baseUrl}}/activity-logs`
Query opsional: `?entity=post_schedules&entityId=<uuid>&page=1&limit=20`.
Hanya log milik user yang login.

---

## Contoh tes negatif

| Skenario | Request | Hasil |
|---|---|---|
| Tanpa token | `GET /brands` tanpa header | `401` |
| Body salah | `POST /brands` dengan `{ "primaryColor": "merah" }` | `400` |
| Field tak dikenal | `POST /brands` dengan `{ "name": "A", "foo": 1 }` | `400` (whitelist) |
| Data user lain | `GET /brands/<id brand user lain>` | `404` |
| Jadwal masa lalu | `POST .../schedules` dengan `scheduledAt` kemarin | `400` |
| Caption ganda | `POST .../schedules` dengan `captionId` **dan** `caption` | `400` |
| Edit setelah tayang | `PATCH /schedules/{{scheduleId}}` setelah publish | `409` |
| Folder kembar | `POST .../folders` dengan nama yang sama | `409` |
| Gambar > 10 MB | `POST .../media` dengan `"size": 20000000` | `400` |
