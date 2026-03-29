import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentStatus,
  Payment,
  BankTransferType,
} from '../../../generated/prisma/client';
import { EventsGateway } from '../events/events/events.gateway';
import { QuotesService } from '../quotes/quotes.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { StellarService } from '../stellar/stellar.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly CHECKOUT_URL =
    process.env.CHECKOUT_URL || 'https://checkout.useroutr.io';
  private readonly BANK_SESSION_TTL_HOURS = Number(
    process.env.BANK_SESSION_TTL_HOURS || 24,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly quotesService: QuotesService,
    private readonly webhooksService: WebhooksService,
    private readonly stellarService: StellarService,
  ) {}

  async onModuleInit() {
    this.logger.log('PaymentsService initialized. Starting expiry monitor.');
    // Simple interval-based expiry check as fallback for missing Scheduler
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
        `Failed to process expired payments: ${err instanceof Error ? err.message : String(err)}`,
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
    amount: any;
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
        metadata: (dto.metadata as any) || {},
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

  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    extra?: Record<string, unknown>,
  ): Promise<Payment> {
    this.logger.log(`Updating payment ${paymentId} status to ${status}`);

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(extra || {}),
        ...(status === PaymentStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      } as any,
    });

    // Emit WebSocket event
    if ((this.eventsGateway as any).server) {
      (this.eventsGateway as any).server
        .to(payment.id)
        .emit('payment.updated', payment);
    }

    // Dispatch webhook
    await this.webhooksService.dispatch(
      payment.merchantId,
      `payment.${status.toLowerCase()}`,
      payment,
      payment.id,
    );

    return payment;
  }

  async getById(paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { merchant: true, quote: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
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

  async findByStellarLockId(lockId: string) {
    return this.prisma.payment.findFirst({
      where: { stellarLockId: lockId },
    });
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

  async handleSourceLock(
    paymentId: string,
    sourceTxHash: string,
    sourceLockId: string,
  ) {
    const payment = await this.getById(paymentId);
    if (payment.status !== PaymentStatus.PENDING) return;

    await this.updateStatus(paymentId, PaymentStatus.SOURCE_LOCKED, {
      sourceTxHash,
      sourceLockId,
    });

    await this.lockOnStellar(paymentId);
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
