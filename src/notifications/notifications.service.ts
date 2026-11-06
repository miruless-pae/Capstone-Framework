import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { ListNotificationsQueryDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  // Dipanggil modul lain (mis. hasil publish). Gagal membuat notifikasi tidak boleh menggagalkan aksi utama.
  async notify(userId: string, title: string, message: string): Promise<void> {
    try {
      await this.notificationRepository.insert({ userId, title, message });
    } catch (error) {
      this.logger.error('Gagal membuat notifikasi', error as Error);
    }
  }

  async findMine(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId, ...(query.unreadOnly ? { readAt: IsNull() } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unread = await this.notificationRepository.countBy({ userId, readAt: IsNull() });
    return { items, total, unread, page, limit };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.update(id, { readAt: notification.readAt });
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const notification = await this.notificationRepository.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    await this.notificationRepository.softDelete(id);
    return { message: 'Notifikasi dihapus' };
  }
}
