import { describe, expect, it } from 'vitest';
import { hashPassword, sha256, verifyPassword } from './password.js';
import { dateKeyInTimeZone, weekdayAndHourInTimeZone } from './date.js';

describe('password', () => {
  it('hash tidak sama dengan password dan bisa diverifikasi', async () => {
    const hash = await hashPassword('Password123');
    expect(hash).not.toContain('Password123');
    expect(await verifyPassword('Password123', hash)).toBe(true);
    expect(await verifyPassword('salah', hash)).toBe(false);
  });

  it('password yang sama menghasilkan hash berbeda (salt acak)', async () => {
    expect(await hashPassword('Password123')).not.toBe(await hashPassword('Password123'));
  });

  it('menolak format hash yang rusak', async () => {
    expect(await verifyPassword('x', 'bukan-hash')).toBe(false);
  });

  it('sha256 deterministik', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toHaveLength(64);
  });
});

describe('date', () => {
  // 2026-10-27 20:00 UTC = 2026-10-28 03:00 WIB (UTC+7)
  const instant = new Date('2026-10-27T20:00:00Z');

  it('tanggal lokal mengikuti zona waktu', () => {
    expect(dateKeyInTimeZone(instant, 'UTC')).toBe('2026-10-27');
    expect(dateKeyInTimeZone(instant, 'Asia/Jakarta')).toBe('2026-10-28');
  });

  it('hari dan jam lokal mengikuti zona waktu', () => {
    // 28 Okt 2026 = Rabu (3)
    expect(weekdayAndHourInTimeZone(instant, 'Asia/Jakarta')).toEqual({ weekday: 3, hour: 3 });
    expect(weekdayAndHourInTimeZone(instant, 'UTC')).toEqual({ weekday: 2, hour: 20 });
  });
});
