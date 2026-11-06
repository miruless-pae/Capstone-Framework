import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CanvaAccount } from './entities/canva-account.entity.js';
import { ConnectCanvaAccountDto } from './dto/connect-canva-account.dto.js';
import { OAuthProvider } from '../common/enums.js';
import { OauthTokensService } from '../oauth-tokens/oauth-tokens.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';

@Injectable()
export class CanvaAccountsService {
  constructor(
    @InjectRepository(CanvaAccount)
    private readonly accountRepository: Repository<CanvaAccount>,
    private readonly dataSource: DataSource,
    private readonly oauthTokens: OauthTokensService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findAll(userId: string): Promise<CanvaAccount[]> {
    return await this.accountRepository.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  // Akun Canva yang sama dihubungkan ulang -> hanya token yang diperbarui.
  async connect(userId: string, dto: ConnectCanvaAccountDto): Promise<CanvaAccount> {
    const accountId = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(CanvaAccount);
      const account =
        (await repository.findOne({ where: { userId, canvaUserId: dto.canvaUserId } })) ??
        (await repository.save(repository.create({ userId, canvaUserId: dto.canvaUserId })));

      await this.oauthTokens.upsert(
        OAuthProvider.CANVA,
        account.id,
        {
          accessToken: dto.accessToken,
          refreshToken: dto.refreshToken,
          expiredAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
        manager,
      );
      return account.id;
    });

    await this.activityLogs.log({
      userId,
      action: 'connect',
      entity: 'canva_accounts',
      entityId: accountId,
    });
    return await this.accountRepository.findOneOrFail({ where: { id: accountId } });
  }

  async disconnect(id: string, userId: string): Promise<{ message: string }> {
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException('Akun Canva tidak ditemukan');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(CanvaAccount).softDelete(id);
      await this.oauthTokens.remove(OAuthProvider.CANVA, id, manager);
    });
    await this.activityLogs.log({
      userId,
      action: 'disconnect',
      entity: 'canva_accounts',
      entityId: id,
    });
    return { message: 'Akun Canva diputuskan' };
  }
}
