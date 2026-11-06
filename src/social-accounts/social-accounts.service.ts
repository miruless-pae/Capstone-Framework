import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SocialAccount } from './entities/social-account.entity.js';
import { ConnectSocialAccountDto } from './dto/connect-social-account.dto.js';
import { providerOf, SocialAccountStatus } from '../common/enums.js';
import { BrandsService } from '../brands/brands.service.js';
import { OauthTokensService } from '../oauth-tokens/oauth-tokens.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';

@Injectable()
export class SocialAccountsService {
  constructor(
    @InjectRepository(SocialAccount)
    private readonly accountRepository: Repository<SocialAccount>,
    private readonly dataSource: DataSource,
    private readonly brandsService: BrandsService,
    private readonly oauthTokens: OauthTokensService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findAll(brandId: string, userId: string): Promise<SocialAccount[]> {
    await this.brandsService.findOwned(brandId, userId);
    return await this.accountRepository.find({
      where: { brandId },
      order: { platform: 'ASC', accountName: 'ASC' },
    });
  }

  // Menghubungkan akun. Jika akun yang sama (platform + accountId) sudah ada, datanya
  // diperbarui (reconnect). Akun dan tokennya disimpan dalam satu transaksi.
  async connect(brandId: string, userId: string, dto: ConnectSocialAccountDto) {
    await this.brandsService.findOwned(brandId, userId);

    const accountId = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SocialAccount);
      const existing = await repository.findOne({
        where: { brandId, platform: dto.platform, accountId: dto.accountId },
      });

      const account = existing
        ? await repository.save({
            ...existing,
            accountName: dto.accountName,
            status: SocialAccountStatus.CONNECTED,
            updatedBy: userId,
          })
        : await repository.save(
            repository.create({
              brandId,
              platform: dto.platform,
              accountName: dto.accountName,
              accountId: dto.accountId,
              status: SocialAccountStatus.CONNECTED,
              createdBy: userId,
              updatedBy: userId,
            }),
          );

      await this.oauthTokens.upsert(
        providerOf(dto.platform),
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
      entity: 'social_accounts',
      entityId: accountId,
      metadata: { platform: dto.platform },
    });
    return await this.accountRepository.findOneOrFail({ where: { id: accountId } });
  }

  async disconnect(id: string, userId: string): Promise<{ message: string }> {
    const account = await this.accountRepository.findOne({
      where: { id, brand: { userId } },
    });
    if (!account) {
      throw new NotFoundException('Akun sosial tidak ditemukan');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(SocialAccount).update(id, { updatedBy: userId });
      await manager.getRepository(SocialAccount).softDelete(id);
      await this.oauthTokens.remove(providerOf(account.platform), id, manager);
    });
    await this.activityLogs.log({
      userId,
      action: 'disconnect',
      entity: 'social_accounts',
      entityId: id,
      metadata: { platform: account.platform },
    });
    return { message: `Akun ${account.platform} diputuskan` };
  }
}
