import { describe, expect, it, vi } from 'vitest';
import { PostSchedulesSchedulerService } from './post-schedules-scheduler.service.js';

function setup(claimed: string[], publish = vi.fn(async () => undefined)) {
  // pg mengembalikan [baris, jumlah] untuk UPDATE ... RETURNING
  const dataSource = { query: vi.fn(async () => [claimed.map((id) => ({ id })), claimed.length]) };
  const config = { get: vi.fn((key: string) => ({ SCHEDULER_BATCH_SIZE: 5 })[key]) };
  const scheduler = new PostSchedulesSchedulerService(
    dataSource as any,
    { publishClaimed: publish } as any,
    config as any,
  );
  return { scheduler, dataSource, publish };
}

describe('PostSchedulesSchedulerService.runOnce', () => {
  it('mem-publish setiap jadwal yang di-claim', async () => {
    const { scheduler, publish, dataSource } = setup(['a', 'b']);
    expect(await scheduler.runOnce()).toBe(2);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenNthCalledWith(1, 'a');
    expect(publish).toHaveBeenNthCalledWith(2, 'b');
    // batch size dipakai sebagai parameter LIMIT
    expect((dataSource.query.mock.calls[0] as unknown[])[1]).toEqual([5]);
  });

  it('meng-claim dari tabel post_schedules', async () => {
    const { scheduler, dataSource } = setup([]);
    await scheduler.runOnce();
    expect((dataSource.query.mock.calls[0] as unknown[])[0]).toContain('post_schedules');
  });

  it('kegagalan satu jadwal tidak menghentikan jadwal lain', async () => {
    const publish = vi.fn(async (id: string) => {
      if (id === 'a') throw new Error('boom');
    });
    const { scheduler } = setup(['a', 'b'], publish);
    expect(await scheduler.runOnce()).toBe(2);
    expect(publish).toHaveBeenCalledWith('b');
  });

  it('tidak ada jadwal jatuh tempo -> tidak memanggil publish', async () => {
    const { scheduler, publish } = setup([]);
    expect(await scheduler.runOnce()).toBe(0);
    expect(publish).not.toHaveBeenCalled();
  });

  it('putaran yang tumpang tindih dilewati', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { scheduler } = setup(['a'], vi.fn(() => gate));

    const first = scheduler.runOnce();
    await Promise.resolve();
    expect(await scheduler.runOnce()).toBe(0); // putaran pertama masih berjalan
    release();
    expect(await first).toBe(1);
  });

  it('error saat claim tidak melempar ke luar', async () => {
    const { scheduler, dataSource } = setup([]);
    dataSource.query.mockRejectedValueOnce(new Error('db down'));
    expect(await scheduler.runOnce()).toBe(0);
  });
});
