import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    await this.findById(id);
    await this.userRepository.update(id, dto);
    await this.activityLogs.log({
      userId: id,
      action: 'update',
      entity: 'users',
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });
    return await this.findById(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findById(id);
    await this.userRepository.softDelete(id);
    await this.activityLogs.log({ userId: id, action: 'delete', entity: 'users', entityId: id });
    return { message: 'Akun dihapus' };
  }
}
