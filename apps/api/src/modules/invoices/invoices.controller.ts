import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceSchema, CreateInvoiceDto } from './dto/create-invoice.dto';
import {
  UpdateInvoiceSchema,
  UpdateInvoiceDto,
  RecordPaymentSchema,
  RecordPaymentDto,
} from './dto/update-invoice.dto';
import { InvoiceFiltersSchema, InvoiceFiltersDto } from './dto/invoice-filters.dto';
import { SendInvoiceSchema, SendInvoiceDto } from './dto/send-invoice.dto';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentMerchant } from '../merchant/decorators/current-merchant.decorator';
import { PublicRoute } from '../../common/decorators/public-route.decorator';

// 1×1 transparent GIF — used as an email open-tracking pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Controller('v1/invoices')
@UseGuards(CombinedAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ── POST /v1/invoices ──────────────────────────────────────────────────────
  @Post()
  async create(
    @CurrentMerchant('id') merchantId: string,
    @Body(new ZodValidationPipe(CreateInvoiceSchema)) dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(merchantId, dto);
  }

  // ── GET /v1/invoices ───────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentMerchant('id') merchantId: string,
    @Query(new ZodValidationPipe(InvoiceFiltersSchema)) filters: InvoiceFiltersDto,
  ) {
    return this.invoicesService.list(merchantId, filters);
  }

  // ── GET /v1/invoices/:id ───────────────────────────────────────────────────
  @Get(':id')
  async getOne(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.getById(id, merchantId);
  }

  // ── PATCH /v1/invoices/:id ─────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceSchema)) dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, merchantId, dto);
  }

  // ── DELETE /v1/invoices/:id ────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invoicesService.delete(id, merchantId);
  }

  // ── POST /v1/invoices/:id/send ─────────────────────────────────────────────
  // Sends the invoice email with optional custom message, schedules reminders
  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  async send(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SendInvoiceSchema)) dto: SendInvoiceDto,
  ) {
    return this.invoicesService.markSent(id, merchantId, dto);
  }

  // ── POST /v1/invoices/:id/cancel ───────────────────────────────────────────
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.cancel(id, merchantId);
  }

  // ── POST /v1/invoices/:id/payments ────────────────────────────────────────
  @Post(':id/payments')
  @UseGuards(JwtAuthGuard)
  async recordPayment(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RecordPaymentSchema)) dto: RecordPaymentDto,
  ) {
    return this.invoicesService.recordPayment(id, merchantId, dto);
  }

  // ── GET /v1/invoices/:id/checkout ─────────────────────────────────────────
  // Public — returns display data for the consumer-facing invoice page.
  @Get(':id/checkout')
  @PublicRoute()
  async getCheckoutData(@Param('id') id: string) {
    return this.invoicesService.getPublicCheckoutData(id);
  }

  // ── POST /v1/invoices/:id/pay ──────────────────────────────────────────────
  // Public — creates a payment session for the invoice, returns paymentId.
  @Post(':id/pay')
  @PublicRoute()
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(@Param('id') id: string) {
    return this.invoicesService.initiatePayment(id);
  }

  // ── GET /v1/invoices/:id/track ─────────────────────────────────────────────
  // Public endpoint — email clients load this pixel when the customer opens the email.
  // Updates invoice SENT → VIEWED and returns a 1×1 transparent GIF.
  @Get(':id/track')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  async trackView(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    // Fire-and-forget — never fail a pixel load due to our own errors
    this.invoicesService.markViewed(id).catch(() => undefined);

    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    res.end(TRACKING_PIXEL);
  }

  // ── GET /v1/invoices/:id/pdf ───────────────────────────────────────────────
  @Get(':id/pdf')
  async getPdfUrl(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    const url = await this.invoicesService.generatePdf(id, merchantId);
    return { url };
  }

  // ── GET /v1/invoices/:id/pdf/download ──────────────────────────────────────
  @Get(':id/pdf/download')
  async downloadPdf(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.invoicesService.getPdfBuffer(id, merchantId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }
}
