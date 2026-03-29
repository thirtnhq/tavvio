import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_ROUTE } from '../decorators/public-route.decorator.js';
import type { Merchant } from '@prisma/client';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<T = Merchant>(
    err: Error | null,
    user: T | false,
    _info: unknown, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): T {
    if (err || !user) {
      throw (
        err ??
        new UnauthorizedException({
          code: 'unauthorized',
          message: 'Invalid or missing JWT',
          docs: 'https://docs.useroutr.io/errors/unauthorized',
        })
      );
    }
    return user;
  }
}
