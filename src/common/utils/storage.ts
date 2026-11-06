// Database hanya menyimpan storage_key (path objek di S3/Cloudinary/dst), bukan file dan bukan URL.
// URL publik dibentuk di sini dari STORAGE_BASE_URL, jadi pindah storage cukup ganti env.
const DEFAULT_BASE_URL = 'http://localhost:3000/files';

export function publicUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) {
    return null;
  }
  const base = (process.env.STORAGE_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  return `${base}/${storageKey.replace(/^\/+/, '')}`;
}
