import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { StellarService } from '../stellar/stellar.service';
import { PrismaService } from '../prisma/prisma.service';
import { BridgeRouterService } from '../bridge/bridge-router.service';
import { Quote } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';

const QUOTE_TTL_SECONDS = 30;

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
    private readonly bridgeRouter: BridgeRouterService,
  ) {}

  /**
   * Create a new quote with rate locking
   * Performs path finding, fee calculation, and Redis locking
   */
  async createQuote(
    dto: CreateQuoteDto,
    merchantId: string,
  ): Promise<QuoteResponseDto> {
    try {
      // Get merchant to access feeBps, settlementChain, settlementAsset
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new NotFoundException('Merchant not found');
      }

      // Apply defaults from merchant
      const toChain = dto.toChain || (merchant.settlementChain as any);
      const toAsset = dto.toAsset || merchant.settlementAsset;

      this.logger.debug(
        `Creating quote: ${dto.fromAmount} ${dto.fromAsset} (${dto.fromChain}) -> ${toAsset} (${toChain})`,
      );

      // Parse amounts
      const fromAmountDecimal = new Decimal(dto.fromAmount);
      if (fromAmountDecimal.isNaN() || fromAmountDecimal.lessThanOrEqualTo(0)) {
        throw new BadRequestException('fromAmount must be a positive number');
      }

      let toAmountDecimal: Decimal;
      let rate: Decimal;
      let bridgeRoute: string | null = null;
      let stellarPath: any = null;

      // Check if same chain and asset (no path finding needed)
      if (
        dto.fromChain === toChain &&
        dto.fromAsset === toAsset
      ) {
        toAmountDecimal = fromAmountDecimal;
        rate = new Decimal(1);
        this.logger.debug('Same chain and asset: 1:1 rate');
      } else {
        // Different chains or assets: find path via Stellar
        const pathResult = await this.findPathForQuote(
          dto.fromChain,
          dto.fromAsset,
          fromAmountDecimal,
          toChain,
          toAsset,
        );

        toAmountDecimal = pathResult.destinationAmount;
        rate = pathResult.destinationAmount.dividedBy(fromAmountDecimal);
        stellarPath = pathResult.path;

        // Determine bridge route
        const routeDecision = this.bridgeRouter.findRoute(
          dto.fromChain,
          toChain,
          dto.fromAsset,
        );
        if (routeDecision.provider !== 'stellar_native') {
          bridgeRoute = routeDecision.provider;
        }
      }

      // Calculate fee
      const feeBps = merchant.feeBps;
      const feeAmount = toAmountDecimal.times(feeBps).dividedBy(10000);
      const netAmount = toAmountDecimal.minus(feeAmount);

      // Determine estimated time via bridge route
      const routeDecision = this.bridgeRouter.findRoute(
        dto.fromChain,
        toChain,
        dto.fromAsset,
      );
      const estimatedTimeMs = routeDecision.estimatedTimeMs;

      // Create quote with TTL
      const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000);

      const quote = await this.prisma.quote.create({
        data: {
          fromChain: dto.fromChain,
          fromAsset: dto.fromAsset,
          fromAmount: fromAmountDecimal,
          toChain,
          toAsset,
          toAmount: netAmount, // Save net amount (after fees)
          rate,
          feeBps,
          feeAmount,
          stellarPath,
          bridgeRoute,
          expiresAt,
          used: false,
        },
      });

      // Lock in Redis with TTL
      await this.redis.setex(
        `quote:${quote.id}`,
        QUOTE_TTL_SECONDS,
        JSON.stringify({ locked: true, createdAt: Date.now() }),
      );

      this.logger.debug(
        `Quote ${quote.id} created and locked for ${QUOTE_TTL_SECONDS}s`,
      );

      return this.toResponseDto(quote, QUOTE_TTL_SECONDS, estimatedTimeMs);
    } catch (error) {
      this.logger.error('Error creating quote:', error);
      throw error;
    }
  }

  /**
   * Find the best path for a quote between two assets
   * Uses Stellar's strict send paths or direct conversion
   */
  private async findPathForQuote(
    fromChain: string,
    fromAsset: string,
    fromAmount: Decimal,
    toChain: string,
    toAsset: string,
  ): Promise<{ destinationAmount: Decimal; path: any }> {
    // For now, if both are on Stellar, use strict send paths
    if (fromChain === 'stellar' && toChain === 'stellar') {
      try {
        const sourceAsset = fromAsset === 'native' ? 'native' : `${fromAsset}:*`;
        const destAsset = toAsset === 'native' ? 'native' : `${toAsset}:*`;

        const pathResult = await this.stellar.findStrictSendPaths({
          sourceAsset,
          sourceAmount: fromAmount.toString(),
          destinationAssets: [destAsset],
        });

        return {
          destinationAmount: new Decimal(pathResult.destinationAmount),
          path: pathResult.paths[0], // Use best path
        };
      } catch (error) {
        this.logger.error('Failed to find Stellar path:', error);
        throw new BadRequestException(
          'No liquidity found on Stellar for this conversion',
        );
      }
    }

    // For cross-chain quotes without Stellar as both endpoints,
    // use a simplified rate (1:1 for now, would integrate oracles in production)
    this.logger.warn(
      `Using simplified rate for cross-chain conversion ${fromChain}:${fromAsset} -> ${toChain}:${toAsset}`,
    );

    return {
      destinationAmount: fromAmount,
      path: null,
    };
  }

  /**
   * Get quote details (for display in checkout)
   */
  async getQuote(quoteId: string): Promise<Quote | null> {
    return this.prisma.quote.findUnique({
      where: { id: quoteId },
    });
  }

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
    const updatedQuote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { used: true },
    });

    // Delete Redis key
    await this.redis.del(`quote:${quoteId}`);

    return updatedQuote;
  }

  /**
   * Convert Quote entity to response DTO
   */
  private toResponseDto(
    quote: Quote,
    expiresInSeconds?: number,
    estimatedTimeMs?: number,
  ): QuoteResponseDto {
    const expiresAt = quote.expiresAt;
    const now = new Date();
    const secondsRemaining = expiresInSeconds ?? Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      id: quote.id,
      fromChain: quote.fromChain,
      fromAsset: quote.fromAsset,
      fromAmount: quote.fromAmount.toString(),
      toChain: quote.toChain,
      toAsset: quote.toAsset,
      toAmount: quote.toAmount.toString(),
      rate: quote.rate.toString(),
      fee: quote.feeAmount.toString(),
      feeBps: quote.feeBps,
      bridgeProvider: quote.bridgeRoute,
      estimatedTimeMs: estimatedTimeMs || 60000, // Default to 60s if not provided
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: secondsRemaining,
    };
  }
}
