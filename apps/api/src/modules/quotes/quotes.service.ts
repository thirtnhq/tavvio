import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { StellarService } from '../stellar/stellar.service';
import { PrismaService } from '../prisma/prisma.service';
import { Quote } from '@prisma/client';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
  ) {}

  async findById(id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async validateAndConsume(quoteId: string): Promise<Quote> {
    const quote = await this.findById(quoteId);

    if (quote.used) {
      throw new ConflictException('Quote has already been used');
    }

    if (new Date() > quote.expiresAt) {
      throw new ConflictException('Quote has expired');
    }

    // Mark as used
    return this.prisma.quote.update({
      where: { id: quoteId },
      data: { used: true },
    });
  }
}
