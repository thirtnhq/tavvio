import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentMerchant } from '../merchant/decorators/current-merchant.decorator';
import { WebhooksService } from './webhooks.service';
import {
  RegisterWebhookDto,
  UpdateWebhookDto,
  WebhookLogFiltersDto,
} from './dto';

@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /v1/webhooks
   * Register a new webhook URL for the merchant
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async register(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: RegisterWebhookDto,
  ) {
    return this.webhooksService.register(merchantId, dto);
  }

  /**
   * GET /v1/webhooks
   * Get current webhook configuration
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getConfig(@CurrentMerchant('id') merchantId: string) {
    return this.webhooksService.getConfig(merchantId);
  }

  /**
   * PATCH /v1/webhooks
   * Update webhook URL or subscribed events
   */
  @Patch()
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(merchantId, dto);
  }

  /**
   * GET /v1/webhooks/logs
   * Get delivery logs with optional filters
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard)
  async getLogs(
    @CurrentMerchant('id') merchantId: string,
    @Query() filters: WebhookLogFiltersDto,
  ) {
    const parsedFilters = {
      status: filters.status,
      eventType: filters.eventType,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: filters.limit ? Math.min(Math.max(filters.limit, 1), 100) : 50,
      offset: filters.offset ? Math.max(filters.offset, 0) : 0,
    };

    return this.webhooksService.getDeliveryLogs(merchantId, parsedFilters);
  }

  /**
   * POST /v1/webhooks/logs/:id/retry
   * Manually retry a failed webhook delivery
   */
  @Post('logs/:id/retry')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async retryDelivery(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') eventId: string,
  ) {
    // Verify the event belongs to this merchant
    const event = await this.webhooksService.getEventDetails(merchantId, eventId);

    if (!event) {
      throw new NotFoundException('Webhook event not found');
    }

    await this.webhooksService.retryEvent(eventId);

    return { success: true, message: 'Webhook retry enqueued' };
  }
}
