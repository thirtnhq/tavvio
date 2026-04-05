import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Invoice, InvoiceStatus, Merchant, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfService } from './pdf.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ConfigService } from '@nestjs/config';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, RecordPaymentDto } from './dto/update-invoice.dto';
import { InvoiceFiltersDto } from './dto/invoice-filters.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { InvoiceTemplateData } from './templates/invoice.template';
import {
  INVOICE_REMINDER_QUEUE,
  ReminderJobData,
} from './invoices.reminder.processor';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface PaginatedInvoices {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  return Number(value.toString());
}

function computeTotals(
  lineItems: Array<{ qty: number; unitPrice: number }>,
  taxRate?: number,
  discount?: number,
): {
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const enriched: LineItem[] = lineItems.map((item) => ({
    description: (item as LineItem).description,
    qty: item.qty,
    unitPrice: item.unitPrice,
    amount: Number((item.qty * item.unitPrice).toFixed(10)),
  }));

  const subtotal = Number(
    enriched.reduce((sum, item) => sum + item.amount, 0).toFixed(10),
  );

  const taxAmount =
    taxRate != null ? Number((subtotal * taxRate).toFixed(10)) : 0;

  const discountAmount = discount ?? 0;

  const total = Number(
    Math.max(0, subtotal + taxAmount - discountAmount).toFixed(10),
  );

  return { lineItems: enriched, subtotal, taxAmount, total };
}

function resolveNextStatus(
  current: InvoiceStatus,
  total: number,
  amountPaid: number,
): InvoiceStatus {
  if (amountPaid <= 0) return current;
  if (amountPaid >= total) return InvoiceStatus.PAID;
  return InvoiceStatus.PARTIALLY_PAID;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly apiUrl: string;
  private readonly checkoutUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
    @InjectQueue(INVOICE_REMINDER_QUEUE)
    private readonly reminderQueue: Queue<ReminderJobData>,
  ) {
    this.apiUrl = this.config.get<string>('API_URL', 'http://localhost:3333');
    this.checkoutUrl = this.config.get<string>(
      'CHECKOUT_URL',
      'http://localhost:3002',
    );
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(merchantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const { lineItems, subtotal, taxAmount, total } = computeTotals(
      dto.lineItems,
      dto.taxRate,
      dto.discount,
    );

    const invoice = await this.prisma.invoice.create({
      data: {
        merchantId,
        invoiceNumber: dto.invoiceNumber,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress
          ? (dto.customerAddress as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
        subtotal: new Prisma.Decimal(subtotal),
        taxRate:
          dto.taxRate != null ? new Prisma.Decimal(dto.taxRate) : undefined,
        taxAmount: taxAmount > 0 ? new Prisma.Decimal(taxAmount) : undefined,
        discount:
          dto.discount != null ? new Prisma.Decimal(dto.discount) : undefined,
        total: new Prisma.Decimal(total),
        amountPaid: new Prisma.Decimal(0),
        currency: dto.currency,
        dueDate: dto.dueDate,
        notes: dto.notes,
        status: InvoiceStatus.DRAFT,
      },
    });

    this.logger.log(`Created invoice ${invoice.id} for merchant ${merchantId}`);
    return invoice;
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async list(
    merchantId: string,
    filters: InvoiceFiltersDto,
  ): Promise<PaginatedInvoices> {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      currency,
      customerEmail,
      from,
      to,
      search,
    } = filters;

    const where: Prisma.InvoiceWhereInput = {
      merchantId,
      ...(status && { status }),
      ...(currency && { currency }),
      ...(customerEmail && { customerEmail }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { id: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            invoiceNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            customerEmail: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            customerName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get by ID ──────────────────────────────────────────────────────────────

  async getById(id: string, merchantId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    if (invoice.merchantId !== merchantId)
      throw new ForbiddenException('Access denied');
    return invoice;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id: string,
    merchantId: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const existing = await this.getById(id, merchantId);

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT invoices can be updated. Current status: ${existing.status}`,
      );
    }

    let lineItems = existing.lineItems as unknown as LineItem[];
    let subtotal = toNumber(existing.subtotal);
    let taxAmount = toNumber(existing.taxAmount);
    let total = toNumber(existing.total);
    let taxRateValue = toNumber(existing.taxRate);
    let discountValue = toNumber(existing.discount);

    if (dto.lineItems) {
      const resolved = computeTotals(
        dto.lineItems,
        dto.taxRate ??
          (existing.taxRate ? toNumber(existing.taxRate) : undefined),
        dto.discount ??
          (existing.discount ? toNumber(existing.discount) : undefined),
      );
      lineItems = resolved.lineItems;
      subtotal = resolved.subtotal;
      taxAmount = resolved.taxAmount;
      total = resolved.total;
    } else if (dto.taxRate !== undefined || dto.discount !== undefined) {
      taxRateValue = dto.taxRate ?? taxRateValue;
      discountValue = dto.discount ?? discountValue;
      const resolved = computeTotals(lineItems, taxRateValue, discountValue);
      subtotal = resolved.subtotal;
      taxAmount = resolved.taxAmount;
      total = resolved.total;
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.invoiceNumber !== undefined && {
          invoiceNumber: dto.invoiceNumber,
        }),
        ...(dto.customerEmail !== undefined && {
          customerEmail: dto.customerEmail,
        }),
        ...(dto.customerName !== undefined && {
          customerName: dto.customerName,
        }),
        ...(dto.customerPhone !== undefined && {
          customerPhone: dto.customerPhone,
        }),
        ...(dto.customerAddress !== undefined && {
          customerAddress: dto.customerAddress as Prisma.InputJsonValue,
        }),
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
        subtotal: new Prisma.Decimal(subtotal),
        taxRate:
          dto.taxRate !== undefined
            ? new Prisma.Decimal(dto.taxRate)
            : undefined,
        taxAmount: taxAmount > 0 ? new Prisma.Decimal(taxAmount) : undefined,
        discount:
          discountValue > 0 ? new Prisma.Decimal(discountValue) : undefined,
        total: new Prisma.Decimal(total),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        pdfUrl: null, // invalidate cached PDF
      },
    });
  }

  // ── Cancel / Delete ────────────────────────────────────────────────────────

  async cancel(id: string, merchantId: string): Promise<Invoice> {
    const existing = await this.getById(id, merchantId);

    const cancellableStatuses: InvoiceStatus[] = [
      InvoiceStatus.DRAFT,
      InvoiceStatus.SENT,
      InvoiceStatus.VIEWED,
    ];

    if (!cancellableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot cancel invoice with status: ${existing.status}`,
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
  }

  async delete(id: string, merchantId: string): Promise<void> {
    const existing = await this.getById(id, merchantId);

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be deleted');
    }

    await this.prisma.invoice.delete({ where: { id } });
    this.logger.log(`Deleted invoice ${id}`);
  }

  // ── Send (DRAFT → SENT + email + webhook + schedule reminders) ─────────────

  async markSent(
    id: string,
    merchantId: string,
    dto: SendInvoiceDto,
  ): Promise<Invoice> {
    const existing = await this.getById(id, merchantId);

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be sent');
    }

    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: {
        name: true,
        email: true,
        logoUrl: true,
        brandColor: true,
        companyName: true,
      },
    });

    // Generate PDF buffer for email attachment
    const templateData = this.buildTemplateData(existing, merchant);
    const pdfBuffer = await this.pdf.generateInvoicePdf(templateData);

    // Upload to storage and persist URL (idempotent — skip if already stored)
    let pdfUrl = existing.pdfUrl;
    if (!pdfUrl) {
      const key = `invoices/${merchantId}/${id}/invoice-${id}.pdf`;
      pdfUrl = await this.storage.upload(key, pdfBuffer, 'application/pdf');
      await this.prisma.invoice.update({ where: { id }, data: { pdfUrl } });
    }

    const amountDue = toNumber(existing.total) - toNumber(existing.amountPaid);

    // Send invoice email with branding + tracking pixel + Pay Now link
    await this.notifications.sendInvoice(
      existing.customerEmail,
      {
        id: existing.id,
        reference: existing.invoiceNumber ?? existing.id,
        amount: amountDue,
        currency: existing.currency,
        dueDate:
          existing.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        merchantName: merchant.companyName ?? merchant.name,
        merchantEmail: merchant.email,
        merchantLogo: merchant.logoUrl ?? undefined,
        merchantBrandColor: merchant.brandColor ?? undefined,
        customerName: existing.customerName ?? undefined,
        message: dto.message,
        trackingPixelUrl: `${this.apiUrl}/v1/invoices/${id}/track`,
        checkoutUrl: `${this.checkoutUrl}/invoice/${id}`,
      },
      pdfBuffer,
    );

    // Update status
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
    });

    // Fire webhook
    await this.webhooks.dispatch(merchantId, 'invoice.sent', {
      invoiceId: id,
      invoiceNumber: existing.invoiceNumber,
      customerEmail: existing.customerEmail,
      total: toNumber(existing.total),
      currency: existing.currency,
      dueDate: existing.dueDate?.toISOString() ?? null,
    });

    // Schedule reminder jobs if due date is set
    if (existing.dueDate) {
      await this.scheduleReminders(id, merchantId, existing.dueDate);
    }

    return updated;
  }

  // ── View tracking (pixel fires from customer email) ────────────────────────

  async markViewed(id: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return;
    if (invoice.status !== InvoiceStatus.SENT) return;

    await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.VIEWED },
    });

    // Fire webhook (best-effort — don't throw if it fails)
    this.webhooks
      .dispatch(invoice.merchantId, 'invoice.viewed', {
        invoiceId: id,
        customerEmail: invoice.customerEmail,
        viewedAt: new Date().toISOString(),
      })
      .catch((err) =>
        this.logger.warn(`invoice.viewed webhook failed for ${id}`, err),
      );
  }

  // ── Record partial/full payment ────────────────────────────────────────────

  async recordPayment(
    id: string,
    merchantId: string,
    dto: RecordPaymentDto,
  ): Promise<Invoice> {
    const existing = await this.getById(id, merchantId);

    const allowedStatuses: InvoiceStatus[] = [
      InvoiceStatus.SENT,
      InvoiceStatus.VIEWED,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ];

    if (!allowedStatuses.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot record payment for invoice with status: ${existing.status}`,
      );
    }

    const total = toNumber(existing.total);
    const currentPaid = toNumber(existing.amountPaid);
    const newAmountPaid = Number((currentPaid + dto.amount).toFixed(10));

    if (newAmountPaid > total) {
      throw new BadRequestException(
        `Payment of ${dto.amount} exceeds remaining balance of ${(total - currentPaid).toFixed(2)}`,
      );
    }

    const newStatus = resolveNextStatus(existing.status, total, newAmountPaid);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: new Prisma.Decimal(newAmountPaid),
        status: newStatus,
        ...(newStatus === InvoiceStatus.PAID && { paidAt: new Date() }),
        ...(dto.paymentId && { paymentId: dto.paymentId }),
      },
    });

    if (newStatus === InvoiceStatus.PAID) {
      await this.webhooks.dispatch(merchantId, 'invoice.paid', {
        invoiceId: id,
        customerEmail: existing.customerEmail,
        total,
        currency: existing.currency,
        paidAt: updated.paidAt?.toISOString(),
      });
    }

    return updated;
  }

  // ── Overdue check (called by cron / scheduler) ─────────────────────────────

  async markOverdueInvoices(): Promise<number> {
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED] },
        dueDate: { lt: new Date() },
      },
      select: {
        id: true,
        merchantId: true,
        customerEmail: true,
        total: true,
        currency: true,
        dueDate: true,
      },
    });

    if (overdueInvoices.length === 0) return 0;

    await this.prisma.invoice.updateMany({
      where: { id: { in: overdueInvoices.map((i) => i.id) } },
      data: { status: InvoiceStatus.OVERDUE },
    });

    // Fire webhook per invoice (best-effort)
    for (const invoice of overdueInvoices) {
      this.webhooks
        .dispatch(invoice.merchantId, 'invoice.overdue', {
          invoiceId: invoice.id,
          customerEmail: invoice.customerEmail,
          total: toNumber(invoice.total),
          currency: invoice.currency,
          dueDate: invoice.dueDate?.toISOString(),
        })
        .catch((err) =>
          this.logger.warn(
            `invoice.overdue webhook failed for ${invoice.id}`,
            err,
          ),
        );
    }

    this.logger.log(`Marked ${overdueInvoices.length} invoice(s) as OVERDUE`);
    return overdueInvoices.length;
  }

  // ── PDF generation ─────────────────────────────────────────────────────────

  async generatePdf(id: string, merchantId: string): Promise<string> {
    const invoice = await this.getById(id, merchantId);

    if (invoice.pdfUrl) return invoice.pdfUrl;

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        name: true,
        email: true,
        logoUrl: true,
        brandColor: true,
        companyName: true,
      },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const templateData = this.buildTemplateData(invoice, merchant);
    const pdfBuffer = await this.pdf.generateInvoicePdf(templateData);

    const key = `invoices/${merchantId}/${id}/invoice-${id}.pdf`;
    const url = await this.storage.upload(key, pdfBuffer, 'application/pdf');

    await this.prisma.invoice.update({ where: { id }, data: { pdfUrl: url } });

    this.logger.log(`PDF generated for invoice ${id}: ${url}`);
    return url;
  }

  // ── Public checkout data (no auth — customer-facing) ──────────────────────

  async getPublicCheckoutData(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: invoice.merchantId },
      select: {
        name: true,
        companyName: true,
        logoUrl: true,
        brandColor: true,
        email: true,
      },
    });

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? null,
      status: invoice.status,
      currency: invoice.currency,
      total: invoice.total.toString(),
      amountPaid: invoice.amountPaid.toString(),
      subtotal: invoice.subtotal.toString(),
      taxAmount: invoice.taxAmount?.toString() ?? null,
      discount: invoice.discount?.toString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      notes: invoice.notes ?? null,
      customerName: invoice.customerName ?? null,
      lineItems: invoice.lineItems,
      merchant: {
        name: merchant?.companyName ?? merchant?.name ?? 'Merchant',
        logo: merchant?.logoUrl ?? null,
        brandColor: merchant?.brandColor ?? null,
        email: merchant?.email ?? null,
      },
    };
  }

  // ── Initiate payment (creates quote + payment, no auth) ────────────────────

  async initiatePayment(invoiceId: string): Promise<{ paymentId: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payableStatuses: InvoiceStatus[] = [
      InvoiceStatus.SENT,
      InvoiceStatus.VIEWED,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ];
    if (!payableStatuses.includes(invoice.status)) {
      throw new BadRequestException(
        `Invoice cannot be paid in status: ${invoice.status}`,
      );
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: invoice.merchantId },
      select: {
        name: true,
        companyName: true,
        logoUrl: true,
        settlementAsset: true,
        settlementChain: true,
        settlementAddress: true,
      },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const amountDue =
      toNumber(invoice.total) - toNumber(invoice.amountPaid);

    if (amountDue <= 0) {
      throw new BadRequestException('Invoice balance is already settled');
    }

    // TTL: use invoice due date if set, otherwise 7 days
    const expiresAt = invoice.dueDate
      ? new Date(
          Math.max(
            invoice.dueDate.getTime(),
            Date.now() + 60 * 60 * 1000, // at least 1 h from now
          ),
        )
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const settlementAsset = merchant.settlementAsset ?? 'USDC';
    const settlementChain = merchant.settlementChain ?? 'stellar';
    const feeBps = 0; // invoice amounts are pre-agreed, no additional fee
    const feeAmount = 0;

    // Create a 1:1 quote — invoice amounts are already final fiat figures
    const quote = await this.prisma.quote.create({
      data: {
        fromChain: 'fiat',
        fromAsset: invoice.currency,
        fromAmount: amountDue,
        toChain: settlementChain,
        toAsset: settlementAsset,
        toAmount: amountDue,
        rate: 1,
        feeBps,
        feeAmount,
        expiresAt,
      },
    });

    const lineItems = Array.isArray(invoice.lineItems)
      ? (invoice.lineItems as Array<{ description: string; qty: number; unitPrice: number; amount: number }>).map((li) => ({
          label: li.description,
          amount: li.amount,
        }))
      : [];

    const payment = await this.prisma.payment.create({
      data: {
        merchantId: invoice.merchantId,
        quoteId: quote.id,
        status: 'PENDING',
        sourceChain: 'fiat',
        sourceAsset: invoice.currency,
        sourceAmount: amountDue,
        destChain: settlementChain,
        destAsset: settlementAsset,
        destAmount: amountDue,
        destAddress: merchant.settlementAddress ?? 'pending',
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber ?? null,
          description: `Invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8).toUpperCase()}`,
          merchantLogo: merchant.logoUrl ?? null,
          lineItems,
          paymentMethods: ['card', 'bank'],
        },
      },
    });

    this.logger.log(
      `Invoice payment initiated: invoice=${invoiceId}, payment=${payment.id}`,
    );

    return { paymentId: payment.id };
  }

  async getPdfBuffer(id: string, merchantId: string): Promise<Buffer> {
    const invoice = await this.getById(id, merchantId);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        name: true,
        email: true,
        logoUrl: true,
        brandColor: true,
        companyName: true,
      },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    return this.pdf.generateInvoicePdf(
      this.buildTemplateData(invoice, merchant),
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async scheduleReminders(
    invoiceId: string,
    merchantId: string,
    dueDate: Date,
  ): Promise<void> {
    const now = Date.now();
    const due = dueDate.getTime();

    const jobs: Array<{
      reminderType: ReminderJobData['reminderType'];
      delay: number;
    }> = [
      {
        reminderType: 'before_due',
        delay: due - now - 3 * 24 * 60 * 60 * 1000,
      },
      { reminderType: 'on_due', delay: due - now },
      { reminderType: 'after_due', delay: due - now + 3 * 24 * 60 * 60 * 1000 },
    ];

    for (const job of jobs) {
      if (job.delay > 0) {
        await this.reminderQueue.add(
          'reminder',
          { invoiceId, merchantId, reminderType: job.reminderType },
          {
            delay: job.delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            jobId: `${invoiceId}_${job.reminderType}`, // idempotent — won't duplicate on re-send
          },
        );
      }
    }

    this.logger.log(`Scheduled reminder jobs for invoice ${invoiceId}`);
  }

  private buildTemplateData(
    invoice: Invoice,
    merchant: Pick<
      Merchant,
      'name' | 'email' | 'logoUrl' | 'brandColor' | 'companyName'
    >,
  ): InvoiceTemplateData {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate ?? undefined,
      status: invoice.status,
      currency: invoice.currency,
      merchantName: merchant.name,
      merchantEmail: merchant.email,
      merchantLogo: merchant.logoUrl ?? undefined,
      merchantBrandColor: merchant.brandColor ?? undefined,
      merchantCompany: merchant.companyName ?? undefined,
      customerEmail: invoice.customerEmail,
      customerName: invoice.customerName ?? undefined,
      customerPhone: invoice.customerPhone ?? undefined,
      customerAddress:
        invoice.customerAddress as unknown as InvoiceTemplateData['customerAddress'],
      lineItems:
        invoice.lineItems as unknown as InvoiceTemplateData['lineItems'],
      subtotal: toNumber(invoice.subtotal),
      taxRate: invoice.taxRate ? toNumber(invoice.taxRate) : undefined,
      taxAmount: invoice.taxAmount ? toNumber(invoice.taxAmount) : undefined,
      discount: invoice.discount ? toNumber(invoice.discount) : undefined,
      total: toNumber(invoice.total),
      amountPaid: toNumber(invoice.amountPaid),
      notes: invoice.notes ?? undefined,
    };
  }
}
