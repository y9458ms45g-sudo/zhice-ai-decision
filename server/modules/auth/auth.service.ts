import { compareSync, hashSync } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { users, passwordResets } from '@server/database/schema';
import type { AuthResponse, LoginRequest, RegisterRequest, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse } from '@shared/api.interface';

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

  async forgotPassword(dto: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const email = dto.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length === 0) {
      return {
        success: true,
        message: '如果该邮箱已注册，重置链接已发送到邮箱',
      };
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.db.insert(passwordResets).values({
      email,
      token,
      expiresAt,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      return {
        success: true,
        message: '开发环境：重置令牌已生成',
        resetToken: token,
        resetUrl: `/reset-password?token=${token}`,
      };
    }

    // TODO: 生产环境发送重置邮件
    return {
      success: true,
      message: '如果该邮箱已注册，重置链接已发送到邮箱',
    };
  }

  async resetPassword(dto: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const { token, newPassword } = dto;

    if (!token) {
      throw new BadRequestException('重置令牌不能为空');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('密码至少6位');
    }

    const now = new Date();
    const found = await this.db
      .select({
        id: passwordResets.id,
        email: passwordResets.email,
        used: passwordResets.used,
        expiresAt: passwordResets.expiresAt,
      })
      .from(passwordResets)
      .where(and(
        eq(passwordResets.token, token),
        eq(passwordResets.used, false),
      ))
      .limit(1);

    if (found.length === 0) {
      throw new BadRequestException('重置链接无效或已被使用');
    }

    const resetRecord = found[0];
    if (resetRecord.expiresAt < now) {
      throw new BadRequestException('重置链接已过期');
    }

    const passwordHash = hashSync(newPassword, 10);

    await this.db.transaction(async (tx) => {
      await tx.update(users)
        .set({ passwordHash })
        .where(eq(users.email, resetRecord.email));

      await tx.update(passwordResets)
        .set({ used: true })
        .where(eq(passwordResets.id, resetRecord.id));
    });

    return {
      success: true,
      message: '密码已重置，请使用新密码登录',
    };
  }
}
