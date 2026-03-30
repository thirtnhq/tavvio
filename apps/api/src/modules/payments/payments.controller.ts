import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  Header,
  StreamableFile,
  Req,
  Logger,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { BankWebhookDto } from './dto/bank-webhook.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';

@Controller('v1')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments')
  @UseGuards(ApiKeyGuard)
  async create(
    @Req() req: any,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    const merchantId = req.merchant?.id || req.user?.merchantId;
    return this.paymentsService.create(merchantId, dto, idempotencyKey);
  }

  // 3. Move export above :id to avoid route conflict
  @Get('payments/export')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="payments.csv"')
  async export(@Req() req: any, @Query() filters: PaymentFiltersDto) {
    const merchantId = req.user.merchantId || req.user.id;
    const csvBuffer = await this.paymentsService.exportTransactions(
      merchantId,
      filters,
    );
    return new StreamableFile(csvBuffer);
  }

  @Get('payments/:id')
  @UseGuards(CombinedAuthGuard)
  async getDetail(@Param('id') id: string) {
    return this.paymentsService.getById(id);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any, @Query() filters: PaymentFiltersDto) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.paymentsService.getByMerchant(merchantId, filters);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async listAlias(@Req() req: any, @Query() filters: PaymentFiltersDto) {
    const merchantId = req.user.merchantId || req.user.id;
    return this.paymentsService.getByMerchant(merchantId, filters);
  }

  @Post('refunds')
  @UseGuards(CombinedAuthGuard)
  async initiateRefund(@Body() body: { paymentId: string }) {
    return this.paymentsService.initiateRefund(body.paymentId);
  }

  @Post('payments/:id/card-session')
  createCardSession(@Param('id') paymentId: string) {
    return this.paymentsService.createCardSession(paymentId);
  }

  @Post('payments/:id/bank-session')
  async getOrCreateBankSession(@Param('id') id: string) {
    return this.paymentsService.getOrCreateBankSession(id);
  }

  @Post('payments/:id/bank-session/regenerate')
  async regenerateBankSession(@Param('id') id: string) {
    return this.paymentsService.regenerateBankSession(id);
  }

  @Post('payments/:id/bank-sent')
  async markBankSent(@Param('id') id: string) {
    return this.paymentsService.markBankTransferSent(id);
  }

  @Post('payments/bank-webhook')
  async bankWebhook(
    @Body() body: BankWebhookDto,
    @Headers('x-bank-webhook-secret') secret?: string,
  ) {
    this.paymentsService.verifyBankWebhookSecret(secret);
    return this.paymentsService.handleBankTransferNotice(body);
  }
}

@Controller()
export class CheckoutPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('checkout/:paymentId')
  getCheckoutPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getCheckoutPayment(paymentId);
  }
}
