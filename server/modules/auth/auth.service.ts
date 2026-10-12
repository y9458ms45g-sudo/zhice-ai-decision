import { compareSync, hashSync } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { users } from '@server/database/schema';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@shared/api.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'zhice-dev-jwt-secret-change-in-prod';
  }

  async register(dto: RegisterRequest): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('密码至少6位');
    }

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('邮箱已被注册');
    }

    const passwordHash = hashSync(password, 10);
    const nickname = dto.nickname?.trim() || '未命名用户';

    const [inserted] = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
        nickname: nickname.slice(0, 100),
      })
      .returning({ id: users.id, email: users.email, nickname: users.nickname });

    if (!inserted) {
      throw new BadRequestException('注册失败，请稍后重试');
    }

    const token = sign(
      { user_id: inserted.id, email: inserted.email },
      this.getJwtSecret(),
      { expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: inserted.id,
        email: inserted.email,
        nickname: inserted.nickname,
      },
    };
  }

  async login(dto: LoginRequest): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const found = await this.db
      .select({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (found.length === 0) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const user = found[0];
    const ok = compareSync(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const token = sign(
      { user_id: user.id, email: user.email },
      this.getJwtSecret(),
      { expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  async getMe(userId: number): Promise<{ id: number; email: string; nickname: string }> {
    const found = await this.db
      .select({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (found.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return found[0];
  }
}
