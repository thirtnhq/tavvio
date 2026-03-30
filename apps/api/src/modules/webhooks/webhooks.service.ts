import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(merchantId: string, eventType: string, payload: any, paymentId?: string) {
    this.logger.log(`Dispatching webhook ${eventType} for merchant ${merchantId}`);

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

    // In a real implementation, this would trigger an async worker to send the POST request
    // For now, we'll just log it
    this.logger.log(`Webhook ${event.id} queued for delivery to merchant ${merchantId}`);
    
    return event;
  }
}
