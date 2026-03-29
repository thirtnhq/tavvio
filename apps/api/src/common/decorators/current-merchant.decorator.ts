import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Merchant } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: Merchant;
}

export const CurrentMerchant = createParamDecorator(
  (data: keyof Merchant | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const merchant: Merchant = request.user;
    return data ? merchant[data] : merchant;
  },
);
