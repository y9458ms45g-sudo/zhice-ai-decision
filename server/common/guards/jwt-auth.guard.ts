import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { verify } from 'jsonwebtoken';

export interface JwtPayload {
  user_id: number;
  email: string;
}

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET || 'zhice-dev-jwt-secret-change-in-prod';

    try {
      const payload = verify(token, secret) as JwtPayload;
      if (!payload || typeof payload.user_id !== 'number') {
        throw new UnauthorizedException('token无效');
      }
      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
  }
}
