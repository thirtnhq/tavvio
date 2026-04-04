import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Invoice, InvoiceStatus, Merchant, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfService } from './pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, RecordPaymentDto } from './dto/update-invoice.dto';
import { InvoiceFiltersDto } from './dto/invoice-filters.dto';
import { InvoiceTemplateData } from './templates/invoice.template';

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
): { lineItems: LineItem[]; subtotal: number; taxAmount: number; total: number } {
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
  ) {}

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
        taxAmount:
          taxAmount > 0 ? new Prisma.Decimal(taxAmount) : undefined,
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
    const { page, limit, sortBy, sortOrder, status, currency, customerEmail, from, to, search } =
      filters;

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
          { invoiceNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { customerEmail: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { customerName: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
    if (invoice.merchantId !== merchantId) throw new ForbiddenException('Access denied');
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
        dto.taxRate ?? (existing.taxRate ? toNumber(existing.taxRate) : undefined),
        dto.discount ?? (existing.discount ? toNumber(existing.discount) : undefined),
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

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.invoiceNumber !== undefined && { invoiceNumber: dto.invoiceNumber }),
        ...(dto.customerEmail !== undefined && { customerEmail: dto.customerEmail }),
        ...(dto.customerName !== undefined && { customerName: dto.customerName }),
        ...(dto.customerPhone !== undefined && { customerPhone: dto.customerPhone }),
        ...(dto.customerAddress !== undefined && {
          customerAddress: dto.customerAddress as Prisma.InputJsonValue,
        }),
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
        subtotal: new Prisma.Decimal(subtotal),
        taxRate: dto.taxRate !== undefined ? new Prisma.Decimal(dto.taxRate) : undefined,
        taxAmount: taxAmount > 0 ? new Prisma.Decimal(taxAmount) : undefined,
        discount: discountValue > 0 ? new Prisma.Decimal(discountValue) : undefined,
        total: new Prisma.Decimal(total),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        // Invalidate cached PDF since content changed
        pdfUrl: null,
      },
    });

    return updated;
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

  // ── Mark as sent ───────────────────────────────────────────────────────────

  async markSent(id: string, merchantId: string): Promise<Invoice> {
    const existing = await this.getById(id, merchantId);

    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be marked as sent');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
    });
  }

  // ── Mark as viewed (public / checkout) ────────────────────────────────────

  async markViewed(id: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return;
    if (invoice.status === InvoiceStatus.SENT) {
      await this.prisma.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.VIEWED },
      });
    }
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

    return this.prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: new Prisma.Decimal(newAmountPaid),
        status: newStatus,
        ...(newStatus === InvoiceStatus.PAID && { paidAt: new Date() }),
        ...(dto.paymentId && { paymentId: dto.paymentId }),
      },
    });
  }

  // ── Overdue check (called by cron or scheduler) ────────────────────────────

  async markOverdueInvoices(): Promise<number> {
    const { count } = await this.prisma.invoice.updateMany({
      where: {
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED] },
        dueDate: { lt: new Date() },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
    return count;
  }

  // ── PDF generation ─────────────────────────────────────────────────────────

  async generatePdf(id: string, merchantId: string): Promise<string> {
    const invoice = await this.getById(id, merchantId);

    // Return cached URL if already generated and invoice not modified since
    if (invoice.pdfUrl) {
      return invoice.pdfUrl;
    }

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

    await this.prisma.invoice.update({
      where: { id },
      data: { pdfUrl: url },
    });

    this.logger.log(`PDF generated and stored for invoice ${id}: ${url}`);
    return url;
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

    const templateData = this.buildTemplateData(invoice, merchant);
    return this.pdf.generateInvoicePdf(templateData);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildTemplateData(
    invoice: Invoice,
    merchant: Pick<Merchant, 'name' | 'email' | 'logoUrl' | 'brandColor' | 'companyName'>,
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
      customerAddress: invoice.customerAddress as unknown as InvoiceTemplateData['customerAddress'],
      lineItems: invoice.lineItems as unknown as InvoiceTemplateData['lineItems'],
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
