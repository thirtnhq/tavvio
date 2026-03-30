import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookStatus } from '@prisma/client';
import {
  WEBHOOK_QUEUE_NAME,
  WEBHOOK_JOB_NAME,
  WEBHOOK_EVENTS,
} from './webhooks.constants';
import {
  WebhookConfig,
  WebhookJobData,
  WebhookLogFilters,
  PaginatedResult,
} from './webhooks.types';
import {
  RegisterWebhookDto,
  UpdateWebhookDto,
  WebhookEventResponseDto,
  WebhookLogFiltersDto,
} from './dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_QUEUE_NAME) private readonly webhookQueue: Queue,
  ) {}

  /**
   * Register a webhook URL for a merchant
   */
  async register(
    merchantId: string,
    dto: RegisterWebhookDto,
  ): Promise<WebhookConfig> {
    // Validate event types
    const validEvents = dto.subscribedEvents.filter((event) =>
      WEBHOOK_EVENTS.includes(event as any),
    );

    if (validEvents.length === 0) {
      throw new BadRequestException('At least one valid event type is required');
    }

    if (validEvents.length !== dto.subscribedEvents.length) {
      throw new BadRequestException(
        `Invalid event types. Valid types are: ${WEBHOOK_EVENTS.join(', ')}`,
      );
    }

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Update merchant with webhook config
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        webhookUrl: dto.webhookUrl,
        webhookSecret,
      },
    });

    this.logger.log(
      `Webhook registered for merchant ${merchantId}: ${dto.webhookUrl}`,
    );

    return {
      webhookUrl: dto.webhookUrl,
      subscribedEvents: validEvents,
    };
  }

  /**
   * Update webhook configuration
   */
  async update(
    merchantId: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookConfig> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!merchant.webhookUrl && !dto.webhookUrl) {
      throw new BadRequestException('No webhook configured');
    }

    const updateData: any = {};

    if (dto.webhookUrl) {
      updateData.webhookUrl = dto.webhookUrl;
    }

    if (dto.subscribedEvents) {
      // Validate event types
      const validEvents = dto.subscribedEvents.filter((event) =>
        WEBHOOK_EVENTS.includes(event as any),
      );

      if (validEvents.length === 0) {
        throw new BadRequestException('At least one valid event type is required');
      }

      if (validEvents.length !== dto.subscribedEvents.length) {
        throw new BadRequestException(
          `Invalid event types. Valid types are: ${WEBHOOK_EVENTS.join(', ')}`,
        );
      }
    }

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
    });

    const updated = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!updated) {
      throw new NotFoundException('Merchant not found after update');
    }

    this.logger.log(`Webhook updated for merchant ${merchantId}`);

    return {
      webhookUrl: updated.webhookUrl || '',
      subscribedEvents: [...WEBHOOK_EVENTS],
    };
  }

  /**
   * Get current webhook configuration
   */
  async getConfig(merchantId: string): Promise<WebhookConfig> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || !merchant.webhookUrl) {
      throw new NotFoundException('No webhook configured for this merchant');
    }

    return {
      webhookUrl: merchant.webhookUrl,
      subscribedEvents: [...WEBHOOK_EVENTS],
    };
  }

  /**
   * Dispatch a webhook event
   * Creates a WebhookEvent record and enqueues a BullMQ job for delivery
   */
  async dispatch(
    merchantId: string,
    eventType: string,
    payload: any,
    paymentId?: string,
  ): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, webhookUrl: true, webhookSecret: true },
    });

    // Skip if merchant has no webhook configured
    if (!merchant?.webhookUrl || !merchant?.webhookSecret) {
      this.logger.debug(
        `No webhook configured for merchant ${merchantId}, skipping dispatch`,
      );
      return;
    }

    // Create webhook event record
    const event = await this.prisma.webhookEvent.create({
      data: {
        merchantId,
        paymentId,
        eventType,
        payload,
        status: WebhookStatus.PENDING,
      },
    });

    // Enqueue BullMQ job for async delivery
    const jobData: WebhookJobData = {
      eventId: event.id,
      merchantId,
      eventType: eventType as any,
      payload,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      attempt: 1,
    };

    await this.webhookQueue.add(WEBHOOK_JOB_NAME, jobData, {
      attempts: 1, // We manage retries ourselves
      backoff: {
        type: 'fixed',
        delay: 0, // Immediate first attempt
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    });

    this.logger.log(
      `Webhook ${event.id} (${eventType}) enqueued for merchant ${merchantId}`,
    );
  }

  /**
   * Get delivery logs for a merchant
   */
  async getDeliveryLogs(
    merchantId: string,
    filters?: WebhookLogFilters,
  ): Promise<PaginatedResult<WebhookEventResponseDto>> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const where: any = {
      merchantId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return {
      data: events as WebhookEventResponseDto[],
      total,
      limit,
      offset,
    };
  }

  /**
   * Manually retry a failed webhook delivery
   */
  async retryEvent(eventId: string): Promise<void> {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Webhook event not found');
    }

    if (event.status === WebhookStatus.DELIVERED) {
      throw new BadRequestException('Cannot retry a successfully delivered event');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: event.merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!merchant?.webhookUrl || !merchant?.webhookSecret) {
      throw new BadRequestException('Merchant webhook not configured');
    }

    // Reset status to PENDING and reset attempts if exhausted
    const newStatus =
      event.status === WebhookStatus.EXHAUSTED
        ? WebhookStatus.PENDING
        : event.status;
    const newAttempts =
      event.status === WebhookStatus.EXHAUSTED ? 0 : event.attempts;

    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        attempts: newAttempts,
        lastAttemptAt: null,
        nextRetryAt: null,
      },
    });

    // Enqueue new job
    const jobData: WebhookJobData = {
      eventId: event.id,
      merchantId: event.merchantId,
      eventType: event.eventType as any,
      payload: event.payload,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      attempt: newAttempts + 1,
    };

    await this.webhookQueue.add(WEBHOOK_JOB_NAME, jobData, {
      attempts: 1,
      backoff: {
        type: 'fixed',
        delay: 0,
      },
    });

    this.logger.log(`Webhook event ${eventId} re-enqueued for retry`);
  }

  /**
   * Get total count of pending webhooks for a merchant
   * (for monitoring/debugging)
   */
  async getPendingCount(merchantId: string): Promise<number> {
    return this.prisma.webhookEvent.count({
      where: {
        merchantId,
        status: WebhookStatus.PENDING,
      },
    });
  }

  /**
   * Get event details if it belongs to the merchant
   * (helper for authorization)
   */
  async getEventDetails(
    merchantId: string,
    eventId: string,
  ): Promise<WebhookEventResponseDto | null> {
    return this.prisma.webhookEvent.findFirst({
      where: {
        id: eventId,
        merchantId,
      },
    }) as Promise<WebhookEventResponseDto | null>;
  }
}
