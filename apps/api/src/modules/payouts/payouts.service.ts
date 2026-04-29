import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DestType, Payout, PayoutStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { StellarService } from '../stellar/stellar.service';
import { CreatePayoutDto, BulkPayoutDto } from './dto/create-payout.dto';
import { PayoutFiltersDto } from './dto/payout-filters.dto';
import { randomUUID } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BulkPayoutResult {
  batchId: string;
  total: number;
  accepted: number;
  rejected: number;
  payouts: Array<{ index: number; payoutId?: string; error?: string }>;
}

type AssetObject = { native?: boolean; code?: string; issuer?: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function assetToString(asset: AssetObject): string {
  if (asset.native) return 'native';
  return `${asset.code}:${asset.issuer}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
    private readonly stellar: StellarService,
  ) {}

  // ── Create single payout ──────────────────────────────────────────────────

async create(
    merchantId: string,
    dto: CreatePayoutDto,
    idempotencyKey?: string,
  ): Promise<Payout> {
    // Deduplicate via idempotency key
    if (idempotencyKey) {
      const existing = await this.prisma.payout.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.merchantId !== merchantId) {
          throw new ConflictException('Idempotency key already used by another merchant');
        }
        return existing;
      }
    }

    let finalDto = { ...dto };

    // If recipientId provided, lookup and merge details
    if (dto.recipientId) {
      const recipient = await this.prisma.recipient.findFirst({
        where: { id: dto.recipientId, merchantId },
      });
      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }
      finalDto = {
        ...dto,
        recipientName: recipient.name,
        destinationType: recipient.type,
        destination: recipient.details as Prisma.InputJsonValue,
      };
    }

    const payout = await this.prisma.payout.create({
      data: {
        merchantId,
        recipientId: dto.recipientId ?? null,
        recipientName: finalDto.recipientName,
        destinationType: finalDto.destinationType as DestType,
        destination: finalDto.destination as Prisma.InputJsonValue,
        amount: dto.amount,
        currency: dto.currency,
        status: PayoutStatus.PENDING,
        scheduledAt: dto.scheduledAt ?? null,
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    this.webhooks
      .dispatch(merchantId, 'payout.initiated', this.webhookPayload(payout) as Prisma.InputJsonValue)
      .catch(() => undefined);

    // Process immediately unless scheduled for the future
    if (!payout.scheduledAt || payout.scheduledAt <= new Date()) {
      this.processPayout(payout).catch(() => undefined);
    }

    return payout;
  }

  // ── Bulk payout ───────────────────────────────────────────────────────────

async createBulk(merchantId: string, dto: BulkPayoutDto): Promise<BulkPayoutResult> {
    const batchId = randomUUID();
    const results: BulkPayoutResult['payouts'] = [];
    let accepted = 0;
    let rejected = 0;

    for (let i = 0; i < dto.payouts.length; i++) {
      const item = dto.payouts[i];
      try {
        let finalItem = { ...item };

        // If recipientId provided, lookup and merge details
        if (item.recipientId) {
          const recipient = await this.prisma.recipient.findFirst({
            where: { id: item.recipientId, merchantId },
          });
          if (!recipient) {
            throw new NotFoundException(`Recipient ${item.recipientId} not found`);
          }
          finalItem = {
            ...item,
            recipientName: recipient.name,
            destinationType: recipient.type,
            destination: recipient.details as Prisma.InputJsonValue,
          };
        }

        const payout = await this.prisma.payout.create({
          data: {
            merchantId,
            recipientId: item.recipientId ?? null,
            recipientName: finalItem.recipientName,
            destinationType: finalItem.destinationType as DestType,
            destination: finalItem.destination as Prisma.InputJsonValue,
            amount: item.amount,
            currency: item.currency,
            status: PayoutStatus.PENDING,
            scheduledAt: item.scheduledAt ?? null,
            batchId,
          },
        });
        results.push({ index: i, payoutId: payout.id });
        accepted++;

        if (!payout.scheduledAt || payout.scheduledAt <= new Date()) {
          this.processPayout(payout).catch(() => undefined);
        }
      } catch (err) {
        rejected++;
        results.push({
          index: i,
          error: err instanceof Error ? err.message : 'Failed to create payout',
        });
      }
    }

    this.webhooks
      .dispatch(merchantId, 'payout.initiated', {
        batchId,
        total: dto.payouts.length,
        accepted,
        rejected,
      } as Prisma.InputJsonValue)
      .catch(() => undefined);

    return { batchId, total: dto.payouts.length, accepted, rejected, payouts: results };
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async list(merchantId: string, filters: PayoutFiltersDto) {
    const where: Prisma.PayoutWhereInput = { merchantId };

    if (filters.status) where.status = filters.status as PayoutStatus;
    if (filters.destinationType) where.destinationType = filters.destinationType as DestType;
    if (filters.currency) where.currency = filters.currency;
    if (filters.batchId) where.batchId = filters.batchId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [total, payouts] = await Promise.all([
      this.prisma.payout.count({ where }),
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
    ]);

    return {
      total,
      limit: filters.limit,
      offset: filters.offset,
      data: payouts.map((p) => this.formatResponse(p)),
    };
  }

  // ── Get by ID ─────────────────────────────────────────────────────────────

  async getById(id: string, merchantId: string): Promise<Payout> {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout || payout.merchantId !== merchantId) {
      throw new NotFoundException('Payout not found');
    }
    return payout;
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(id: string, merchantId: string): Promise<Payout> {
    const payout = await this.getById(id, merchantId);

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel a payout in ${payout.status} status — only PENDING payouts can be cancelled`,
      );
    }

    return this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.CANCELLED },
    });
  }

  // ── Retry ─────────────────────────────────────────────────────────────────

  async retry(id: string, merchantId: string): Promise<Payout> {
    const payout = await this.getById(id, merchantId);

    if (payout.status !== PayoutStatus.FAILED) {
      throw new BadRequestException(
        `Cannot retry a payout in ${payout.status} status — only FAILED payouts can be retried`,
      );
    }

    const reset = await this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.PENDING, failureReason: null },
    });

    this.webhooks
      .dispatch(merchantId, 'payout.initiated', this.webhookPayload(reset) as Prisma.InputJsonValue)
      .catch(() => undefined);

    this.processPayout(reset).catch(() => undefined);

    return reset;
  }

  // ── Internal processing ───────────────────────────────────────────────────

  private async processPayout(payout: Payout): Promise<void> {
    await this.prisma.payout.update({
      where: { id: payout.id },
      data: { status: PayoutStatus.PROCESSING },
    });

    try {
      const destination = payout.destination as Record<string, unknown>;

      const isStellarPayout =
        payout.destinationType === DestType.STELLAR ||
        (payout.destinationType === DestType.CRYPTO_WALLET &&
          typeof destination.network === 'string' &&
          destination.network.toLowerCase() === 'stellar');

      if (isStellarPayout) {
        await this.processStellarPayout(payout, destination);
      }
      // BANK_ACCOUNT and MOBILE_MONEY remain PROCESSING until external system
      // delivers and calls back to update the status.
    } catch (err) {
      const failureReason = err instanceof Error ? err.message : 'Processing failed';
      const failed = await this.prisma.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.FAILED, failureReason },
      });
      this.webhooks
        .dispatch(payout.merchantId, 'payout.failed', {
          ...this.webhookPayload(failed),
          failureReason,
        } as Prisma.InputJsonValue)
        .catch(() => undefined);
      this.logger.error(`Payout ${payout.id} failed: ${failureReason}`);
    }
  }

  private async processStellarPayout(
    payout: Payout,
    destination: Record<string, unknown>,
  ): Promise<void> {
    const destAddress = String(destination.address);
    const destAsset = typeof destination.asset === 'string' ? destination.asset : 'native';
    const sourceAsset = 'native';
    const sourceAmount = payout.amount.toString();

    const { paths } = await this.stellar.findStrictSendPaths({
      sourceAsset,
      sourceAmount,
      destinationAssets: [destAsset],
      destinationAccount: destAddress,
    });

    const bestPath = paths[0];
    // Convert asset objects to the 'native' | 'CODE:issuer' strings parseAsset expects
    const pathStrings: string[] = (bestPath?.path ?? []).map((a) =>
      assetToString(a as AssetObject),
    );
    const destMin = (
      parseFloat(bestPath?.destinationAmount ?? sourceAmount) * 0.99
    ).toFixed(7);

    const txHash = await this.stellar.executePathPayment({
      sourceAsset,
      sourceAmount,
      destinationAccount: destAddress,
      destinationAsset: destAsset,
      destinationMinAmount: destMin,
      path: pathStrings,
    });

    const completed = await this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: PayoutStatus.COMPLETED,
        completedAt: new Date(),
        stellarTxHash: txHash,
      },
    });

    this.webhooks
      .dispatch(payout.merchantId, 'payout.completed', {
        ...this.webhookPayload(completed),
        stellarTxHash: txHash,
      } as Prisma.InputJsonValue)
      .catch(() => undefined);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

private formatResponse(payout: Payout) {
    return {
      id: payout.id,
      merchantId: payout.merchantId,
      recipientId: payout.recipientId,
      recipientName: payout.recipientName,
      destinationType: payout.destinationType,
      destination: payout.destination,
      amount: payout.amount.toString(),
      currency: payout.currency,
      status: payout.status,
      stellarTxHash: payout.stellarTxHash,
      scheduledAt: payout.scheduledAt,
      completedAt: payout.completedAt,
      failureReason: payout.failureReason,
      batchId: payout.batchId,
      createdAt: payout.createdAt,
    };
  }

  private webhookPayload(payout: Payout): Record<string, unknown> {
    return {
      payoutId: payout.id,
      recipientName: payout.recipientName,
      amount: payout.amount.toString(),
      currency: payout.currency,
      destinationType: payout.destinationType,
      status: payout.status,
      ...(payout.batchId && { batchId: payout.batchId }),
      ...(payout.stellarTxHash && { stellarTxHash: payout.stellarTxHash }),
      createdAt: payout.createdAt.toISOString(),
    };
  }
}
