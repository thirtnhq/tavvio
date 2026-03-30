import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookStatus } from '@prisma/client';
import {
  WEBHOOK_QUEUE_NAME,
  WEBHOOK_JOB_NAME,
  RETRY_DELAYS,
  MAX_ATTEMPTS,
  WEBHOOK_REQUEST_TIMEOUT,
} from './webhooks.constants';
import { WebhookJobData } from './webhooks.types';
import { signWebhookPayload } from './webhooks.util';

@Processor(WEBHOOK_QUEUE_NAME)
@Injectable()
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    @InjectQueue(WEBHOOK_QUEUE_NAME) private readonly webhookQueue: Queue,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    if (job.name === WEBHOOK_JOB_NAME) {
      await this.handleDelivery(job);
    } else {
      this.logger.warn(`Unknown job name: ${job.name}`);
      throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async handleDelivery(job: Job<WebhookJobData>): Promise<void> {
    const {
      eventId,
      merchantId,
      eventType,
      payload,
      webhookUrl,
      webhookSecret,
      attempt,
    } = job.data;

    this.logger.log(
      `Processing webhook delivery: ${eventId} (attempt ${attempt}/${MAX_ATTEMPTS})`,
    );

    try {
      // Build request payload
      const payloadJson = JSON.stringify(payload);

      // Sign payload with HMAC-SHA256
      const signature = signWebhookPayload(payloadJson, webhookSecret);

      // POST to merchant's webhook URL
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Useroutr-Signature': signature,
          'Content-Type': 'application/json',
          'User-Agent': 'Useroutr-Webhook/1.0',
        },
        timeout: WEBHOOK_REQUEST_TIMEOUT,
        validateStatus: () => true, // Don't throw on any status code
      });

      // Check if delivery was successful (2xx status)
      if (response.status >= 200 && response.status < 300) {
        // Mark as DELIVERED
        await this.prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: WebhookStatus.DELIVERED,
            attempts: attempt,
            lastAttemptAt: new Date(),
          },
        });

        this.logger.log(
          `Webhook ${eventId} delivered successfully (HTTP ${response.status})`,
        );
        return;
      } else {
        // Non-2xx response - treat as failure
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Unknown error';

      this.logger.warn(
        `Webhook ${eventId} delivery failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${errorMessage}`,
      );

      // Determine next action
      if (attempt < MAX_ATTEMPTS) {
        // Schedule retry with exponential backoff
        const delayMs = RETRY_DELAYS[attempt - 1]; // attempt is 1-indexed, array is 0-indexed
        const nextRetryAt = new Date(Date.now() + delayMs);

        await this.prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: WebhookStatus.FAILED,
            attempts: attempt,
            lastAttemptAt: new Date(),
            nextRetryAt,
          },
        });

        this.logger.log(
          `Webhook ${eventId} will retry at ${nextRetryAt.toISOString()} (delay: ${delayMs}ms)`,
        );

        // Re-enqueue with delay
        await this.webhookQueue.add(
          WEBHOOK_JOB_NAME,
          {
            eventId,
            merchantId,
            eventType,
            payload,
            webhookUrl,
            webhookSecret,
            attempt: attempt + 1,
          },
          {
            delay: delayMs,
            attempts: 1,
            backoff: {
              type: 'fixed' as const,
              delay: 0, // We manage delay via job.queue.add delay param
            },
          },
        );
      } else {
        // Max attempts exceeded - mark as EXHAUSTED
        await this.prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: WebhookStatus.EXHAUSTED,
            attempts: attempt,
            lastAttemptAt: new Date(),
          },
        });

        this.logger.error(
          `Webhook ${eventId} exhausted after ${MAX_ATTEMPTS} attempts. Last error: ${errorMessage}`,
        );
      }

      // Throw to mark job as failed in BullMQ, but we've already handled retry logic
      throw new Error(
        `Webhook delivery failed after ${attempt} attempt(s): ${errorMessage}`,
      );
    }
  }
}
