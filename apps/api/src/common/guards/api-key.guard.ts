import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import type { Merchant } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service.js';
import { IS_PUBLIC_ROUTE } from '../decorators/public-route.decorator.js';
import type { AuthenticatedRequest } from '../decorators/current-merchant.decorator.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Missing API key',
        docs: 'https://docs.useroutr.io/errors/unauthorized',
      });
    }

    const apiKey: string = authHeader.slice(7);

    if (!apiKey.startsWith('ur_live_') && !apiKey.startsWith('ur_test_')) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid API key format',
        docs: 'https://docs.useroutr.io/errors/unauthorized',
      });
    }

    // Check new ApiKey table
    const apiKeys = await this.prisma.apiKey.findMany({
      select: { id: true, keyHash: true, merchantId: true },
    });

    for (const key of apiKeys) {
      if (await bcrypt.compare(apiKey, key.keyHash)) {
        // Update lastUsedAt
        await this.prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });

        const fullMerchant: Merchant | null =
          await this.prisma.merchant.findUnique({
            where: { id: key.merchantId },
          });

        if (!fullMerchant) {
          throw new UnauthorizedException({
            code: 'unauthorized',
            message: 'Merchant not found',
            docs: 'https://docs.useroutr.io/errors/unauthorized',
          });
        }

        request.user = fullMerchant;
        return true;
      }
    }

    // Fallback: check legacy apiKeyHash on Merchant (backward compat)
    const merchants = await this.prisma.merchant.findMany({
      where: { apiKeyHash: { not: null } },
      select: { id: true, apiKeyHash: true },
    });

    for (const merchant of merchants) {
      if (
        merchant.apiKeyHash &&
        (await bcrypt.compare(apiKey, merchant.apiKeyHash))
      ) {
        const fullMerchant: Merchant | null =
          await this.prisma.merchant.findUnique({
            where: { id: merchant.id },
          });

        if (!fullMerchant) {
          throw new UnauthorizedException({
            code: 'unauthorized',
            message: 'Merchant not found',
            docs: 'https://docs.useroutr.io/errors/unauthorized',
          });
        }

        request.user = fullMerchant;
        return true;
      }
    }

    throw new UnauthorizedException({
      code: 'unauthorized',
      message: 'Invalid or missing API key',
      docs: 'https://docs.useroutr.io/errors/unauthorized',
    });
  }
}
