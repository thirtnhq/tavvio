import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Payment, Prisma } from '@prisma/client';
import { EventsGateway } from '../events/events/events.gateway';
import { QuotesService } from '../quotes/quotes.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { StellarService } from '../stellar/stellar.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { SourceLockEvent } from '@tavvio/types';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly CHECKOUT_URL =
    process.env.CHECKOUT_URL || 'https://checkout.useroutr.io';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly quotesService: QuotesService,
    private readonly webhooksService: WebhooksService,
    private readonly stellarService: StellarService,
  ) {}

  async getById(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  async findById(id: string): Promise<Payment | null> {
    return await this.prisma.payment.findUnique({ where: { id } });
  }

  async handleSourceLock(event: SourceLockEvent): Promise<Payment | null> {
    this.logger.log(`Handling source lock: ${event.lockId} on ${event.chain}`);

    // Match hashlock to a pending payment. We use hashlock as the unique identifier
    // for this swap across chains before it's properly linked.
    const payment = await this.prisma.payment.findFirst({
      where: {
        hashlock: event.hashlock,
        status: PaymentStatus.PENDING,
      },
    });

    if (!payment) {
      this.logger.warn(
        `No pending payment found for hashlock: ${event.hashlock}`,
      );
      return null;
    }

    // Update payment with source lock info
    const expiresAt = new Date(event.timelock * 1000);
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        sourceLockId: event.lockId,
        sourceAddress: event.sender,
        status: PaymentStatus.SOURCE_LOCKED,
        expiresAt,
      },
    });

    if (this.eventsGateway.server) {
      this.eventsGateway.server
        .to(payment.id)
        .emit('payment.updated', updatedPayment);
    }

    return updatedPayment;
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    extra: Prisma.PaymentUncheckedUpdateInput = {},
  ): Promise<Payment> {
    this.logger.log(`Updating payment ${id} status to ${status}`);

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        ...extra,
        ...(status === PaymentStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
    });

    if (this.eventsGateway.server) {
      this.eventsGateway.server.to(id).emit('payment.updated', updatedPayment);
    }

    // Dispatch webhook for status change
    await this.webhooksService.dispatch(
      updatedPayment.merchantId,
      `payment.${status.toLowerCase()}`,
      updatedPayment,
      updatedPayment.id,
    );

    return updatedPayment;
  }

  async findByStellarLockId(stellarLockId: string): Promise<Payment | null> {
    return await this.prisma.payment.findFirst({
      where: { stellarLockId },
    });
  }

  async findExpiredLocked(): Promise<Payment[]> {
    const now = new Date();
    return await this.prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.SOURCE_LOCKED, PaymentStatus.STELLAR_LOCKED],
        },
        OR: [
          { expiresAt: { lt: now } },
          // Heuristic if expiresAt is somehow missing
          {
            expiresAt: null,
            createdAt: { lt: new Date(now.getTime() - 2 * 3600 * 1000) },
          },
        ],
      },
    });
  }

  onModuleInit() {
    this.logger.log('PaymentsService initialized. Starting expiry monitor.');
    // Simple interval-based expiry check as fallback for missing Scheduler
    setInterval(() => void this.processExpiredPending(), 60_000);
  }

  async processExpiredPending() {
    try {
      const expired = await this.findExpiredPending();
      if (expired.length > 0) {
        this.logger.log(
          `Found ${expired.length} expired pending payments. Marking as EXPIRED.`,
        );
        for (const p of expired) {
          await this.updateStatus(p.id, PaymentStatus.EXPIRED);
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to process expired payments: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async create(
    merchantId: string,
    dto: CreatePaymentDto,
    idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    this.logger.log(
      `Creating payment for merchant ${merchantId} with quote ${dto.quoteId}`,
    );

    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        this.logger.log(
          `Returning existing payment for idempotency key: ${idempotencyKey}`,
        );
        return this.formatPaymentResponse(existing);
      }
    }

    // Fetch merchant to get settlement preferences
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    // 1. Validate and consume quote
    const quote = await this.quotesService.validateAndConsume(dto.quoteId);

    // 2. Generate HTLC secret + hashlock
    const secret = crypto.randomBytes(32);
    const hashlock = crypto.createHash('sha256').update(secret).digest('hex');
    const secretHex = secret.toString('hex');

    // 3. Create payment record (status: PENDING)
    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        quoteId: quote.id,
        status: PaymentStatus.PENDING,
        sourceChain: quote.fromChain,
        sourceAsset: quote.fromAsset,
        sourceAmount: quote.fromAmount,
        destChain: quote.toChain,
        destAsset: quote.toAsset,
        destAmount: quote.toAmount,
        destAddress: merchant.settlementAddress || 'system_vault',
        hashlock,
        htlcSecret: secretHex,
        idempotencyKey,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? {},
      },
    });

    // 4. Return payment
    return this.formatPaymentResponse(payment);
  }

  private formatPaymentResponse(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      status: payment.status.toLowerCase(),
      checkout_url: `${this.CHECKOUT_URL}/pay/${payment.id}`,
      amount: Number(payment.sourceAmount),
      currency: payment.sourceAsset,
      settlement_amount: payment.destAmount.toString(),
      settlement_asset: payment.destAsset,
      metadata: payment.metadata,
      created_at: payment.createdAt,
      expires_at: new Date(payment.createdAt.getTime() + 30 * 60 * 1000),
    };
  }

  async getByMerchant(merchantId: string, filters: PaymentFiltersDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      search,
      from,
      to,
      currency,
      minAmount,
      maxAmount,
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { merchantId };
    if (status) where.status = status;
    if (currency) where.sourceAsset = currency;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (minAmount || maxAmount) {
      where.sourceAmount = {};
      if (minAmount) where.sourceAmount.gte = minAmount;
      if (maxAmount) where.sourceAmount.lte = maxAmount;
    }

    if (search) {
      where.OR = [{ id: { contains: search, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findBySourceLockId(lockId: string) {
    return this.prisma.payment.findFirst({
      where: { sourceLockId: lockId },
    });
  }

  async findExpiredPending() {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    return this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        createdAt: { lt: thirtyMinAgo },
      },
    });
  }

  async lockOnStellar(paymentId: string) {
    const payment = await this.getById(paymentId);

    try {
      const stellarTxHash = await this.stellarService.lockHTLC({
        sender: 'vault_address',
        receiver: payment.destAddress,
        token: payment.destAsset,
        amount: BigInt(Math.floor(Number(payment.destAmount))),
        hashlock: payment.hashlock!,
        timelock: Math.floor(Date.now() / 1000) + 3600,
      });

      await this.updateStatus(paymentId, PaymentStatus.STELLAR_LOCKED, {
        stellarTxHash,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Stellar lock failed for payment ${paymentId}: ${message}`,
      );
      await this.updateStatus(paymentId, PaymentStatus.FAILED);
    }
  }

  async notifyCompletion(paymentId: string) {
    await this.updateStatus(paymentId, PaymentStatus.COMPLETED);
  }

  async initiateRefund(paymentId: string): Promise<Payment> {
    const payment = await this.getById(paymentId);

    const refundableStatuses: PaymentStatus[] = [
      PaymentStatus.SOURCE_LOCKED,
      PaymentStatus.STELLAR_LOCKED,
      PaymentStatus.PROCESSING,
      PaymentStatus.COMPLETED,
    ];

    if (!refundableStatuses.includes(payment.status)) {
      throw new ConflictException(
        `Payment in status ${payment.status} cannot be refunded`,
      );
    }

    return this.updateStatus(paymentId, PaymentStatus.REFUNDING);
  }

  async exportTransactions(
    merchantId: string,
    filters: PaymentFiltersDto,
  ): Promise<Buffer> {
    const { items } = await this.getByMerchant(merchantId, {
      ...filters,
      limit: 1000,
    });
    const header = 'id,amount,currency,status,createdAt\n';
    const rows = items
      .map(
        (p) =>
          `${p.id},${p.sourceAmount},${p.sourceAsset},${p.status},${p.createdAt.toISOString()}`,
      )
      .join('\n');
    return Buffer.from(header + rows);
  }
}
