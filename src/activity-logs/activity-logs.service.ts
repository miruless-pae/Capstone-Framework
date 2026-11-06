import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity.js';
import { ListActivityLogsQueryDto } from './dto/activity-log.dto.js';

export interface LogInput {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepository: Repository<ActivityLog>,
  ) {}

  // Mencatat tidak boleh menggagalkan aksi utama: error hanya dilaporkan di log server.
  async log(input: LogInput): Promise<void> {
    try {
      await this.logRepository.save(this.logRepository.create({
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? null,
      }));
    } catch (error) {
      this.logger.error(`Gagal mencatat activity log (${input.entity}.${input.action})`, error as Error);
    }
  }

  async findMine(userId: string, query: ListActivityLogsQueryDto) {
    const where: FindOptionsWhere<ActivityLog> = { userId };
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.logRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
