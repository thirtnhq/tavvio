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
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentMerchant } from '../merchant/decorators/current-merchant.decorator';

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
  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  async markSent(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.markSent(id, merchantId);
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

  // ── GET /v1/invoices/:id/pdf ───────────────────────────────────────────────
  // Returns a redirect or the stored PDF URL (generates if not yet cached)
  @Get(':id/pdf')
  async getPdfUrl(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    const url = await this.invoicesService.generatePdf(id, merchantId);
    return { url };
  }

  // ── GET /v1/invoices/:id/pdf/download ──────────────────────────────────────
  // Streams the PDF directly in the HTTP response
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
