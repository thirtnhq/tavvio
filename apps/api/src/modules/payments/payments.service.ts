import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentStatus,
  Payment,
  Prisma,
  BankTransferType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events/events.service';
import { QuotesService } from '../quotes/quotes.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { StellarService } from '../stellar/stellar.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { SourceLockEvent } from '@useroutr/types';
import * as crypto from 'crypto';

interface CheckoutLineItem {
  label: string;
  amount: number;
}

export interface CheckoutPaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  merchantName: string;
  merchantLogo?: string;
  description?: string;
  lineItems?: CheckoutLineItem[];
  expiresAt?: string;
}

export interface CardSessionResponse {
  clientSecret: string;
}

type PaymentWithRelations = Payment & {
  merchant: {
    id: string;
    name: string;
    webhookUrl: string | null;
  };
  quote: {
    id: string;
    fromAsset: string;
    fromAmount: Prisma.Decimal | number;
    toAsset: string;
    toAmount: Prisma.Decimal | number;
    rate: Prisma.Decimal | number;
    feeAmount: Prisma.Decimal | number;
    expiresAt: Date;
  };
};

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly CHECKOUT_URL =
    process.env.CHECKOUT_URL || 'https://checkout.useroutr.io';
  private readonly BANK_SESSION_TTL_HOURS = Number(
    process.env.BANK_SESSION_TTL_HOURS || 24,
  );
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly quotesService: QuotesService,
    private readonly webhooksService: WebhooksService,
    private readonly stellarService: StellarService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

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

    if (this.eventsService) {
      this.eventsService.emitPaymentStatus(
        payment.id,
        payment.merchantId,
        PaymentStatus.SOURCE_LOCKED,
        {
          updatedAt: new Date(),
        },
      );
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

    if (this.eventsService) {
      this.eventsService.emitPaymentStatus(
        id,
        updatedPayment.merchantId,
        status,
        {
          sourceTxHash: updatedPayment.sourceTxHash || undefined,
          stellarTxHash: updatedPayment.stellarTxHash || undefined,
          destAmount: updatedPayment.destAmount?.toString(),
          destAsset: updatedPayment.destAsset,
          updatedAt: updatedPayment.updatedAt,
        },
      );
    }

    await this.webhooksService.dispatch(
      updatedPayment.merchantId,
      `payment.${status.toLowerCase()}` as import('../webhooks/webhooks.constants').WebhookEventType,
      updatedPayment as unknown as import('@prisma/client').Prisma.InputJsonValue,
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
    setInterval(() => {
      void this.processExpiredPending();
      void this.processExpiredBankSessions();
    }, 60_000);
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
        `Failed to process expired payments: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async processExpiredBankSessions() {
    try {
      const now = new Date();
      const expired = await this.prisma.bankSession.findMany({
        where: {
          expiresAt: { lt: now },
        },
        select: { id: true },
      });

      if (expired.length > 0) {
        this.logger.log(`Found ${expired.length} expired bank sessions.`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to scan expired bank sessions: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Payment creation ──────────────────────────────────────────────────

  async create(
    merchantId: string,
    dto: CreatePaymentDto,
    idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    this.logger.log(
      `Creating payment for merchant ${merchantId} with quote ${dto.quoteId}`,
    );

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

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const quote = await this.quotesService.validateAndConsume(dto.quoteId);

    const secret = crypto.randomBytes(32);
    const hashlock = crypto.createHash('sha256').update(secret).digest('hex');
    const secretHex = secret.toString('hex');

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
      metadata: payment.metadata as Record<string, unknown> | null,
      created_at: payment.createdAt,
      expires_at: new Date(payment.createdAt.getTime() + 30 * 60 * 1000),
    };
  }

  private async getByIdWithRelations(
    paymentId: string,
  ): Promise<PaymentWithRelations> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { merchant: true, quote: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment as PaymentWithRelations;
  }

  // ── Checkout ──────────────────────────────────────────────────────────

  async getCheckoutPayment(
    paymentId: string,
  ): Promise<CheckoutPaymentResponse> {
    const payment = await this.getByIdWithRelations(paymentId);
    const metadata = this.asRecord(payment.metadata);
    const description = this.readString(metadata.description);
    const merchantLogo = this.readString(metadata.merchantLogo);
    const lineItems = this.readLineItems(metadata.lineItems);

    return {
      id: payment.id,
      amount: this.toNumber(payment.sourceAmount),
      currency: this.getCardCurrency(payment.sourceAsset).toUpperCase(),
      status: payment.status,
      merchantName: payment.merchant.name,
      merchantLogo: merchantLogo ?? undefined,
      description: description ?? undefined,
      lineItems:
        lineItems.length > 0
          ? lineItems
          : [
              {
                label: description ?? 'Payment total',
                amount: this.toNumber(payment.sourceAmount),
              },
            ],
      expiresAt: payment.quote.expiresAt.toISOString(),
    };
  }

  async getCheckoutQuote(paymentId: string) {
    const payment = await this.getByIdWithRelations(paymentId);
    const quote = payment.quote;

    return {
      id: quote.id,
      fromAmount: this.toNumber(quote.fromAmount),
      fromCurrency: quote.fromAsset,
      toAmount: this.toNumber(quote.toAmount),
      toCurrency: quote.toAsset,
      rate: this.toNumber(quote.rate),
      fee: this.toNumber(quote.feeAmount),
      expiresAt: quote.expiresAt.toISOString(),
    };
  }

  // ── Card payment (Stripe) ─────────────────────────────────────────────

  async createCardSession(paymentId: string): Promise<CardSessionResponse> {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured on the API.',
      );
    }

    const payment = await this.getByIdWithRelations(paymentId);

    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      throw new ConflictException(
        `Payment ${payment.id} can no longer accept card sessions.`,
      );
    }

    if (payment.status === PaymentStatus.EXPIRED) {
      throw new ConflictException(`Payment ${payment.id} has expired.`);
    }

    const amount = this.toMinorUnits(payment.sourceAmount);
    const currency = this.getCardCurrency(payment.sourceAsset);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
      metadata: {
        paymentId: payment.id,
        merchantId: payment.merchantId,
      },
      description: `Useroutr checkout payment ${payment.id}`,
    });

    if (!paymentIntent.client_secret) {
      throw new ServiceUnavailableException(
        'Stripe did not return a client secret for this payment.',
      );
    }

    const nextStatus: PaymentStatus =
      payment.status === PaymentStatus.FAILED
        ? PaymentStatus.PENDING
        : payment.status;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        metadata: this.mergeMetadata(payment.metadata, {
          paymentMethod: 'card',
          stripe: {
            paymentIntentId: paymentIntent.id,
            clientSecretIssuedAt: new Date().toISOString(),
            currency,
          },
        }),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }

  async handleStripeWebhook(
    signature: string | undefined,
    rawBody: Buffer | undefined,
  ): Promise<void> {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured on the API.',
      );
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Stripe webhook secret is not configured on the API.',
      );
    }

    if (!signature || !rawBody) {
      throw new BadRequestException('Missing Stripe signature or raw body.');
    }

    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    if (event.type === 'payment_intent.succeeded') {
      await this.handlePaymentIntentSucceeded(event);
      return;
    }

    if (event.type === 'payment_intent.payment_failed') {
      await this.handlePaymentIntentFailed(event);
    }
  }

  private async handlePaymentIntentSucceeded(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentId = paymentIntent.metadata.paymentId;

    if (!paymentId) {
      this.logger.warn(
        `Stripe event ${event.id} is missing paymentId metadata; skipping.`,
      );
      return;
    }

    const payment = await this.getById(paymentId);
    const updatedMetadata = this.mergeMetadata(payment.metadata, {
      paymentMethod: 'card',
      stripe: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        eventId: event.id,
        succeededAt: new Date().toISOString(),
      },
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          metadata: updatedMetadata,
        },
      }),
      this.prisma.webhookEvent.create({
        data: {
          merchantId: payment.merchantId,
          paymentId: payment.id,
          eventType: 'payment.completed',
          payload: {
            paymentId: payment.id,
            merchantId: payment.merchantId,
            amount: this.toNumber(payment.sourceAmount),
            currency: this.getCardCurrency(payment.sourceAsset).toUpperCase(),
            provider: 'stripe',
            stripePaymentIntentId: paymentIntent.id,
            settlementStatus: 'queued',
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  private async handlePaymentIntentFailed(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentId = paymentIntent.metadata.paymentId;

    if (!paymentId) {
      this.logger.warn(
        `Stripe event ${event.id} is missing paymentId metadata; skipping.`,
      );
      return;
    }

    const payment = await this.getById(paymentId);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: this.mergeMetadata(payment.metadata, {
            paymentMethod: 'card',
            stripe: {
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
              eventId: event.id,
              failedAt: new Date().toISOString(),
              lastError:
                paymentIntent.last_payment_error?.message ??
                'Card payment failed',
            },
          }),
        },
      }),
      this.prisma.webhookEvent.create({
        data: {
          merchantId: payment.merchantId,
          paymentId: payment.id,
          eventType: 'payment.failed',
          payload: {
            paymentId: payment.id,
            merchantId: payment.merchantId,
            provider: 'stripe',
            stripePaymentIntentId: paymentIntent.id,
            reason:
              paymentIntent.last_payment_error?.message ??
              'Card payment failed',
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  // ── Bank transfer session ─────────────────────────────────────────────

  async getOrCreateBankSession(paymentId: string) {
    const payment = await this.getById(paymentId);
    const now = new Date();
    const existing = await this.prisma.bankSession.findUnique({
      where: { paymentId },
    });

    if (existing) {
      if (existing.expiresAt < now) {
        return {
          expired: true,
          session: this.toBankSessionResponse(existing),
        };
      }

      return {
        expired: false,
        session: this.toBankSessionResponse(existing),
      };
    }

    const type = this.resolveBankTransferType(payment);
    const reference = await this.createUniqueReference(payment.id);
    const account = this.resolveDestinationAccount(type, payment.id);
    const expiresAt = new Date(
      now.getTime() + this.BANK_SESSION_TTL_HOURS * 60 * 60 * 1000,
    );

    const created = await this.prisma.bankSession.create({
      data: {
        paymentId,
        reference,
        type,
        bankName: account.bankName,
        accountNumber: this.encryptAtRest(account.accountNumber),
        routingNumber: account.routingNumber,
        iban: account.iban,
        bic: account.bic,
        branchCode: account.branchCode,
        amount: payment.sourceAmount,
        currency: payment.sourceAsset,
        instructions: this.buildInstructions(type),
        expiresAt,
      },
    });

    return {
      expired: false,
      session: this.toBankSessionResponse(created),
    };
  }

  async regenerateBankSession(paymentId: string) {
    const now = new Date();
    const existing = await this.prisma.bankSession.findUnique({
      where: { paymentId },
    });
    if (existing && existing.expiresAt >= now) {
      return {
        expired: false,
        session: this.toBankSessionResponse(existing),
      };
    }

    if (existing) {
      await this.prisma.bankSession.delete({ where: { paymentId } });
    }

    return this.getOrCreateBankSession(paymentId);
  }

  async markBankTransferSent(paymentId: string) {
    const payment = await this.getById(paymentId);
    const session = await this.prisma.bankSession.findUnique({
      where: { paymentId },
    });

    if (!session) {
      throw new BadRequestException(
        'Bank session not found. Create one first.',
      );
    }

    if (session.expiresAt < new Date()) {
      throw new ConflictException(
        'Bank session has expired. Regenerate instructions.',
      );
    }

    if (payment.status === PaymentStatus.AWAITING_CONFIRMATION) {
      throw new ConflictException('Transfer already marked as sent');
    }

    const allowedSentStates: PaymentStatus[] = [
      PaymentStatus.PENDING,
      PaymentStatus.SOURCE_LOCKED,
    ];
    if (!allowedSentStates.includes(payment.status)) {
      throw new ConflictException(
        `Cannot mark transfer sent from status ${payment.status}`,
      );
    }

    return this.updateStatus(payment.id, PaymentStatus.AWAITING_CONFIRMATION);
  }

  async handleBankTransferNotice(payload: {
    reference: string;
    amount: string;
    currency: string;
    transactionId?: string;
  }) {
    const session = await this.prisma.bankSession.findUnique({
      where: { reference: payload.reference },
    });

    if (!session) {
      this.logger.warn(
        `Bank notice unmatched by reference: ${payload.reference}`,
      );
      return { matched: false, reason: 'reference_not_found' as const };
    }

    const payment = await this.getById(session.paymentId);
    const amountMatches = session.amount.toString() === payload.amount;
    const currencyMatches =
      session.currency.toUpperCase() === payload.currency.toUpperCase();

    if (!amountMatches || !currencyMatches) {
      this.logger.warn(
        `Bank notice mismatch for payment ${payment.id}: amount/currency mismatch`,
      );
      return { matched: false, reason: 'amount_or_currency_mismatch' as const };
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { matched: true, status: payment.status };
    }

    await this.updateStatus(payment.id, PaymentStatus.PROCESSING, {
      sourceTxHash: payload.transactionId || payment.sourceTxHash,
    });
    const updated = await this.updateStatus(
      payment.id,
      PaymentStatus.COMPLETED,
    );

    return {
      matched: true,
      status: updated.status,
      paymentId: payment.id,
    };
  }

  verifyBankWebhookSecret(secret?: string) {
    const expected = process.env.BANK_WEBHOOK_SECRET;
    if (!expected) {
      this.logger.warn(
        'BANK_WEBHOOK_SECRET is not configured; bank webhook accepts all requests',
      );
      return;
    }

    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Invalid bank webhook secret');
    }
  }

  // ── Common query / lifecycle methods ──────────────────────────────────

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

    const where: Prisma.PaymentWhereInput = { merchantId };
    if (status) where.status = status;
    if (currency) where.sourceAsset = currency;

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    if (minAmount || maxAmount) {
      where.sourceAmount = {
        ...(minAmount ? { gte: minAmount } : {}),
        ...(maxAmount ? { lte: maxAmount } : {}),
      };
    }

    if (search) {
      where.OR = [{ id: { contains: search, mode: 'insensitive' as const } }];
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
          `${p.id},${String(p.sourceAmount)},${p.sourceAsset},${p.status},${p.createdAt.toISOString()}`,
      )
      .join('\n');
    return Buffer.from(header + rows);
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private getCardCurrency(asset: string): string {
    const normalized = asset.trim().toLowerCase();
    return normalized === 'usdc' ? 'usd' : normalized;
  }

  private toMinorUnits(amount: unknown): number {
    const numericAmount = this.toNumber(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    return Math.max(1, Math.round(numericAmount * 100));
  }

  private toNumber(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(String(value));
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('Payment amount is invalid.');
    }
    return numeric;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private readLineItems(value: unknown): CheckoutLineItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const record = entry as Record<string, unknown>;
      const label = this.readString(record.label);
      const amount = Number(record.amount);

      if (!label || !Number.isFinite(amount)) {
        return [];
      }

      return [{ label, amount }];
    });
  }

  private mergeMetadata(
    current: unknown,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    return {
      ...this.asRecord(current),
      ...patch,
    } as Prisma.InputJsonValue;
  }

  private resolveBankTransferType(payment: Payment): BankTransferType {
    const chain = payment.sourceChain.toLowerCase();
    if (
      chain.includes('eu') ||
      chain.includes('uk') ||
      chain.includes('sepa')
    ) {
      return BankTransferType.SEPA;
    }
    if (
      chain.includes('ng') ||
      chain.includes('ke') ||
      chain.includes('gh') ||
      chain.includes('za')
    ) {
      return BankTransferType.LOCAL;
    }
    return BankTransferType.ACH;
  }

  private resolveDestinationAccount(type: BankTransferType, paymentId: string) {
    const suffix = paymentId.slice(-4).toUpperCase();
    if (type === BankTransferType.SEPA) {
      return {
        bankName: 'Euro Settlement Bank',
        accountNumber: `DE89370400440532013000`,
        routingNumber: null,
        iban: `DE89370400440532013000`,
        bic: 'COBADEFFXXX',
        branchCode: null,
      };
    }

    if (type === BankTransferType.LOCAL) {
      return {
        bankName: 'First National Local',
        accountNumber: `10345678${suffix}`,
        routingNumber: null,
        iban: null,
        bic: null,
        branchCode: '001',
      };
    }

    return {
      bankName: 'First National',
      accountNumber: `123456${suffix}`,
      routingNumber: '021000021',
      iban: null,
      bic: null,
      branchCode: null,
    };
  }

  private buildInstructions(type: BankTransferType): string {
    if (type === BankTransferType.SEPA) {
      return 'Include the reference exactly as shown. SEPA confirmation may take 1-3 business days.';
    }
    if (type === BankTransferType.LOCAL) {
      return 'Include the reference exactly as shown and use local transfer rails only.';
    }
    return 'Include the reference exactly as shown. ACH confirmation may take 1-3 business days.';
  }

  private async createUniqueReference(paymentId: string) {
    const primary = this.buildReference(paymentId, 0);
    const existing = await this.prisma.bankSession.findUnique({
      where: { reference: primary },
    });
    if (!existing) return primary;

    const fallback = this.buildReference(paymentId, 1);
    const fallbackExisting = await this.prisma.bankSession.findUnique({
      where: { reference: fallback },
    });
    if (!fallbackExisting) return fallback;

    throw new ConflictException('Failed to allocate unique bank reference');
  }

  private buildReference(paymentId: string, retry: number) {
    const input = `${paymentId}:${retry}`;
    const hash = crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .slice(0, 10);
    const base36 = BigInt(`0x${hash}`).toString(36).toUpperCase();
    return `TVP-${base36.slice(0, 8)}`;
  }

  private encryptAtRest(value: string) {
    const key = process.env.BANK_SESSION_ENCRYPTION_KEY;
    if (!key) return value;

    const normalized = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', normalized, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptAtRead(value: string) {
    if (!value.startsWith('enc:')) return value;

    const key = process.env.BANK_SESSION_ENCRYPTION_KEY;
    if (!key) {
      throw new ConflictException(
        'Encrypted bank account value cannot be read without encryption key',
      );
    }

    const normalized = crypto.createHash('sha256').update(key).digest();
    const [, ivHex, tagHex, dataHex] = value.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      normalized,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const clear = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return clear.toString('utf8');
  }

  private maskAccount(value: string) {
    const visible = value.slice(-4);
    return `****${visible}`;
  }

  private maskIban(value: string | null) {
    if (!value) return null;
    const visible = value.slice(-6);
    return `******${visible}`;
  }

  private toBankSessionResponse(session: {
    bankName: string;
    accountNumber: string;
    routingNumber: string | null;
    iban: string | null;
    bic: string | null;
    branchCode: string | null;
    reference: string;
    amount: Prisma.Decimal | number | string;
    currency: string;
    instructions: string;
    type: BankTransferType;
    expiresAt: Date;
  }) {
    const accountNumber = this.decryptAtRead(session.accountNumber);
    return {
      bankName: session.bankName,
      accountNumber: this.maskAccount(accountNumber),
      routingNumber: session.routingNumber,
      iban: this.maskIban(session.iban),
      bic: session.bic,
      branchCode: session.branchCode,
      reference: session.reference,
      amount: session.amount.toString(),
      currency: session.currency,
      instructions: session.instructions,
      type: session.type,
      expiresAt: session.expiresAt,
    };
  }
}
