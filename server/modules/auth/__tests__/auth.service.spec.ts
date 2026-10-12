import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { compareSync } from 'bcryptjs';
import { AuthService } from '../auth.service';
import type { RegisterRequest, LoginRequest } from '@shared/api.interface';

type UserRow = {
  id: number;
  email: string;
  passwordHash: string;
  nickname: string;
};

function filterBy(rows: UserRow[], cond: any): UserRow[] {
  const column = cond?.left?.column;
  const value = cond?.right?.value?.val ?? cond?.value?.val;
  if (!column || value === undefined) return rows;
  return rows.filter((r) => (r as any)[column] === value);
}

function createMockDb(initialUsers: UserRow[] = []) {
  let users: UserRow[] = [...initialUsers];
  let nextId = initialUsers.length > 0
    ? Math.max(...initialUsers.map((u) => u.id)) + 1
    : 1;

  return {
    getUsers: () => users,
    select: (cols: Record<string, unknown>) => ({
      from: (_table: unknown) => ({
        where: (cond: any) => ({
          limit: (limitNum: number): Promise<Record<string, unknown>[]> => {
            const filtered = filterBy(users, cond).slice(0, limitNum);
            const keys = Object.keys(cols);
            return Promise.resolve(
              filtered.map((row) => {
                const r: Record<string, unknown> = {};
                for (const key of keys) {
                  r[key] = row[key as keyof UserRow];
                }
                return r;
              }),
            );
          },
          then: (onfulfilled: (value: unknown) => unknown) => {
            const filtered = filterBy(users, cond);
            const keys = Object.keys(cols);
            return Promise.resolve(
              filtered.map((row) => {
                const r: Record<string, unknown> = {};
                for (const key of keys) {
                  r[key] = row[key as keyof UserRow];
                }
                return r;
              }),
            ).then(onfulfilled);
          },
        }),
      }),
    }),
    insert: (_table: unknown) => ({
      values: (vals: Partial<UserRow>) => ({
        returning: (cols: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
          const newUser: UserRow = {
            id: nextId++,
            email: vals.email ?? '',
            passwordHash: vals.passwordHash ?? '',
            nickname: vals.nickname ?? '未命名用户',
          };
          users.push(newUser);
          const keys = Object.keys(cols);
          const row: Record<string, unknown> = {};
          for (const key of keys) {
            row[key] = newUser[key as keyof UserRow];
          }
          return Promise.resolve([row]);
        },
      }),
    }),
  };
}

describe('AuthService', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let service: AuthService;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new AuthService(mockDb as unknown as Parameters<typeof AuthService.prototype.constructor>[0]);
  });

  it('注册: 新用户能注册，密码被bcrypt加密', async () => {
    const dto: RegisterRequest = { email: 'test@example.com', password: 'password123', nickname: '测试用户' };
    const result = await service.register(dto);
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.nickname).toBe('测试用户');
    expect(result.user.id).toBeGreaterThan(0);

    const savedUser = mockDb.getUsers().find((u) => u.email === 'test@example.com');
    expect(savedUser).toBeDefined();
    expect(savedUser?.passwordHash).not.toBe('password123');
    expect(compareSync('password123', savedUser?.passwordHash ?? '')).toBe(true);
  });

  it('注册: 重复邮箱返回409', async () => {
    const dto: RegisterRequest = { email: 'duplicate@example.com', password: 'pass123' };
    await service.register(dto);
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });

  it('登录: 正确密码返回token', async () => {
    const regDto: RegisterRequest = { email: 'login@example.com', password: 'mypass123' };
    await service.register(regDto);

    const loginDto: LoginRequest = { email: 'login@example.com', password: 'mypass123' };
    const result = await service.login(loginDto);
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('login@example.com');
  });

  it('登录: 错误密码返回401', async () => {
    const regDto: RegisterRequest = { email: 'fail@example.com', password: 'correctpass' };
    await service.register(regDto);

    const loginDto: LoginRequest = { email: 'fail@example.com', password: 'wrongpass' };
    await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
  });
});
