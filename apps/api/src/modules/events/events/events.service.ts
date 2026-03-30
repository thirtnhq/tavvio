import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

/**
 * Events Service
 * Handles real-time event emission to connected WebSocket clients
 * Called by other services to push updates to the dashboard and checkout
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly gateway: EventsGateway) {}

  /**
   * Emit payment status changes to both merchant dashboard and payer checkout
   * Called whenever a payment transitions between statuses
   *
   * @param paymentId - The payment ID
   * @param merchantId - The merchant ID (for dashboard subscription)
   * @param status - The new payment status
   * @param data - Additional context data per status
   */
  emitPaymentStatus(
    paymentId: string,
    merchantId: string,
    status: string,
    data?: {
      destAmount?: string;
      destAsset?: string;
      stellarTxHash?: string;
      sourceTxHash?: string;
      reason?: string;
      updatedAt?: Date;
    },
  ): void {
    try {
      const payload = {
        event: 'payment:status',
        data: {
          paymentId,
          status,
          updatedAt: data?.updatedAt || new Date().toISOString(),
          ...data,
        },
      };

      this.logger.debug(
        `Emitting payment:status for payment ${paymentId} to merchant ${merchantId}`,
      );

      // Emit to merchant dashboard (listens on merchant:{merchantId} room)
      this.gateway.server
        .to(`merchant:${merchantId}`)
        .emit('message', payload);

      // Emit to specific payment subscribers (checkout listens on payment:{paymentId} room)
      this.gateway.server.to(`payment:${paymentId}`).emit('message', payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Emit webhook delivery status to merchant dashboard
   * Called by WebhooksService when a webhook is delivered or fails
   *
   * @param merchantId - The merchant ID
   * @param webhookEvent - The webhook event details
   */
  emitWebhookDelivery(
    merchantId: string,
    webhookEvent: any,
  ): void {
    try {
      const payload = {
        event: 'webhook:delivery',
        data: {
          id: webhookEvent.id,
          eventType: webhookEvent.eventType,
          status: webhookEvent.status,
          attempts: webhookEvent.attempts,
          createdAt: new Date(webhookEvent.createdAt).toISOString(),
        },
      };

      this.logger.debug(
        `Emitting webhook:delivery for ${webhookEvent.id} to merchant ${merchantId}`,
      );

      // Only dashboard cares about webhook delivery logs
      this.gateway.server
        .to(`merchant:${merchantId}`)
        .emit('message', payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit webhook delivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Emit payout status changes to merchant dashboard
   * Called by PayoutsService on payout status transitions
   *
   * @param merchantId - The merchant ID
   * @param payoutId - The payout ID
   * @param status - The new payout status
   * @param data - Additional context data
   */
  emitPayoutStatus(
    merchantId: string,
    payoutId: string,
    status: string,
    data?: {
      amount?: string;
      currency?: string;
      stellarTxHash?: string;
      failureReason?: string;
      updatedAt?: Date;
    },
  ): void {
    try {
      const payload = {
        event: 'payout:status',
        data: {
          payoutId,
          status,
          updatedAt: data?.updatedAt || new Date().toISOString(),
          ...data,
        },
      };

      this.logger.debug(
        `Emitting payout:status for payout ${payoutId} to merchant ${merchantId}`,
      );

      // Emit to merchant dashboard
      this.gateway.server
        .to(`merchant:${merchantId}`)
        .emit('message', payload);

      // Emit to payout subscribers if needed
      this.gateway.server.to(`payout:${payoutId}`).emit('message', payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit payout status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Emit link paid notification to merchant dashboard
   * Called by LinksService when a payment link is successfully paid
   *
   * @param merchantId - The merchant ID
   * @param linkId - The payment link ID
   * @param paymentId - The associated payment ID
   * @param data - Additional context about the payment
   */
  emitLinkPaid(
    merchantId: string,
    linkId: string,
    paymentId: string,
    data?: {
      amount?: string;
      currency?: string;
      sourceAsset?: string;
      sourceChain?: string;
      sourceAmount?: string;
      completedAt?: Date;
    },
  ): void {
    try {
      const payload = {
        event: 'notification',
        data: {
          type: 'link_paid',
          title: 'Payment Link Completed',
          message: `Link payment received successfully`,
          resourceId: linkId,
          paymentId,
          completedAt: data?.completedAt || new Date().toISOString(),
          ...data,
        },
      };

      this.logger.debug(
        `Emitting link:paid for link ${linkId} to merchant ${merchantId}`,
      );

      // Only merchant dashboard cares about this notification
      this.gateway.server
        .to(`merchant:${merchantId}`)
        .emit('message', payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit link paid notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Emit invoice paid notification to merchant dashboard
   * Called by InvoicesService when an invoice is fully paid
   *
   * @param merchantId - The merchant ID
   * @param invoiceId - The invoice ID
   * @param paymentId - The associated payment ID
   * @param amount - The payment amount
   */
  emitInvoicePaid(
    merchantId: string,
    invoiceId: string,
    paymentId: string,
    amount?: string,
  ): void {
    try {
      const payload = {
        event: 'notification',
        data: {
          type: 'invoice_paid',
          title: 'Invoice Paid',
          message: `Invoice payment received`,
          resourceId: invoiceId,
          paymentId,
          amount,
          paidAt: new Date().toISOString(),
        },
      };

      this.logger.debug(
        `Emitting invoice:paid for invoice ${invoiceId} to merchant ${merchantId}`,
      );

      this.gateway.server
        .to(`merchant:${merchantId}`)
        .emit('message', payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit invoice paid notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
