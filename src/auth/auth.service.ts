import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UserStatus } from '../common/enums.js';
import { hashPassword, sha256, verifyPassword } from '../common/utils/password.js';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto.js';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // data user yang aman dikirim ke client (tanpa hash/token)
  private toProfile(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
    };
  }

  private async issueToken(user: User) {
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: this.toProfile(user) };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    // withDeleted: email akun yang sudah dihapus tetap tidak boleh dipakai ulang (unique index)
    const exists = await this.userRepository.findOne({ where: { email }, withDeleted: true });
    if (exists) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const user = await this.userRepository.save(
      this.userRepository.create({
        name: dto.name,
        email,
        passwordHash: await hashPassword(dto.password),
      }),
    );
    return await this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    // pesan sengaja sama untuk email salah / password salah
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email atau password salah');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    user.lastLogin = new Date();
    await this.userRepository.update(user.id, { lastLogin: user.lastLogin });
    return await this.issueToken(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    const response: { message: string; resetToken?: string } = {
      // respons sama baik email terdaftar maupun tidak (mencegah enumerasi email)
      message: 'Jika email terdaftar, instruksi reset password telah dikirim',
    };

    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.userRepository.update(user.id, {
        resetTokenHash: sha256(token),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      // TODO: kirim token lewat email. Sebelum ada layanan email, token hanya
      // dikembalikan di mode development supaya alurnya bisa diuji.
      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        response.resetToken = token;
      }
    }
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.resetTokenHash', 'user.resetTokenExpiresAt'])
      .where('user.resetTokenHash = :hash', { hash: sha256(dto.token) })
      .getOne();

    if (!user?.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Token tidak valid atau sudah kedaluwarsa');
    }

    await this.userRepository.update(user.id, {
      passwordHash: await hashPassword(dto.password),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
    return { message: 'Password berhasil direset' };
  }
}
