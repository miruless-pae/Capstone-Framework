import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OauthToken } from './entities/oauth-token.entity.js';
import { OAuthProvider } from '../common/enums.js';

export interface TokenInput {
  accessToken: string;
  refreshToken?: string | null;
  expiredAt?: Date | null;
}

// Satu-satunya tempat yang membaca/menulis token. Modul lain tidak menyentuh tabel oauth_tokens.
@Injectable()
export class OauthTokensService {
  constructor(
    @InjectRepository(OauthToken)
    private readonly tokenRepository: Repository<OauthToken>,
  ) {}

  // Simpan token baru, atau perbarui jika (provider, owner) sudah punya token.
  // Lewat `manager` supaya bisa ikut transaksi pemanggil.
  async upsert(
    provider: OAuthProvider,
    ownerId: string,
    input: TokenInput,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(OauthToken) : this.tokenRepository;
    const values = {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiredAt: input.expiredAt ?? null,
    };
    const existing = await repository.findOne({ where: { provider, ownerId } });
    if (existing) {
      await repository.update(existing.id, values);
    } else {
      await repository.save(repository.create({ provider, ownerId, ...values }));
    }
  }

  // Dipakai PlatformPublisher yang sungguhan untuk mengambil token saat publish.
  async find(provider: OAuthProvider, ownerId: string): Promise<OauthToken | null> {
    return await this.tokenRepository
      .createQueryBuilder('token')
      .addSelect(['token.accessToken', 'token.refreshToken'])
      .where('token.provider = :provider AND token.ownerId = :ownerId', { provider, ownerId })
      .getOne();
  }

  async remove(provider: OAuthProvider, ownerId: string, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(OauthToken) : this.tokenRepository;
    await repository.softDelete({ provider, ownerId });
  }
}
