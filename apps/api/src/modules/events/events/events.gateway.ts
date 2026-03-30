import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * WebSocket Gateway for Real-Time Updates
 *
 * Handles connections from:
 * - Dashboard (authenticated with JWT)
 * - Checkout (authenticated with payment session token)
 *
 * Room Structure:
 * - merchant:{merchantId} - All merchant-scoped events (dashboard listens)
 * - payment:{paymentId} - Payment-specific updates (checkout listens)
 * - payout:{payoutId} - Payout-specific updates
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      process.env.DASHBOARD_URL || 'http://localhost:3001',
      process.env.CHECKOUT_URL || 'http://localhost:3002',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  // Track authenticated user context per socket for cleanup and auth validation
  private socketContextMap = new Map<
    string,
    {
      merchantId?: string;
      paymentId?: string;
      type: 'merchant' | 'payment';
      connectedAt: Date;
    }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle new WebSocket connections
   * Validates authentication token in handshake query
   *
   * Dashboard: Uses JWT in `?token=Bearer...`
   * Checkout: Uses payment session token in `?sessionToken=...` or `?paymentId=...`
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const { token, sessionToken, paymentId, type } = client.handshake.query as {
        token?: string;
        sessionToken?: string;
        paymentId?: string;
        type?: string;
      };

      this.logger.debug(
        `WebSocket connection attempt - Token: ${token ? 'yes' : 'no'}, PaymentId: ${paymentId}, Type: ${type}`,
      );

      // Dashboard connection - validate JWT
      if (token && type === 'merchant') {
        const merchantId = await this.validateDashboardAuth(token as string);
        this.socketContextMap.set(client.id, {
          merchantId,
          type: 'merchant',
          connectedAt: new Date(),
        });

        client.join(`merchant:${merchantId}`);
        this.logger.log(
          `Dashboard client connected - Merchant: ${merchantId}, SocketId: ${client.id}`,
        );

        return;
      }

      // Checkout connection - validate payment session or paymentId
      if ((paymentId || sessionToken) && type === 'payment') {
        const payment = await this.validateCheckoutAuth(
          paymentId as string,
          sessionToken as string,
        );

        this.socketContextMap.set(client.id, {
          paymentId: payment.id,
          type: 'payment',
          connectedAt: new Date(),
        });

        // Automatically subscribe to their payment
        client.join(`payment:${payment.id}`);
        this.logger.log(
          `Checkout client connected - Payment: ${payment.id}, SocketId: ${client.id}`,
        );

        return;
      }

      // Invalid connection - no valid auth provided
      this.logger.warn(`Connection rejected - Invalid or missing authentication`);
      client.disconnect(true);
    } catch (error) {
      this.logger.error(
        `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Handle client disconnection
   * Cleanup socket context and room subscriptions
   */
  handleDisconnect(client: Socket): void {
    const context = this.socketContextMap.get(client.id);

    if (context) {
      const roomId =
        context.type === 'merchant'
          ? `merchant:${context.merchantId}`
          : `payment:${context.paymentId}`;

      this.logger.log(
        `Client disconnected - ${context.type === 'merchant' ? 'Merchant' : 'Payment'}: ${context.merchantId || context.paymentId}, SocketId: ${client.id}`,
      );
    }

    // Clean up the socket context
    this.socketContextMap.delete(client.id);
  }

  /**
   * Merchant subscribes to merchant-scoped events
   * Called when dashboard wants to listen to merchant updates
   */
  @SubscribeMessage('subscribe:merchant')
  async handleMerchantSubscribe(
    client: Socket,
    merchantId: string,
  ): Promise<{ subscribed: boolean; merchant: string }> {
    const context = this.socketContextMap.get(client.id);

    // Validate that the client is authenticated as a merchant and owns this merchant
    if (!context || context.type !== 'merchant' || context.merchantId !== merchantId) {
      throw new WsException(
        'Unauthorized - cannot subscribe to other merchant events',
      );
    }

    // Ensure client is in the merchant room
    client.join(`merchant:${merchantId}`);

    this.logger.log(
      `Merchant ${merchantId} subscribed to merchant events (SocketId: ${client.id})`,
    );

    return {
      subscribed: true,
      merchant: merchantId,
    };
  }

  /**
   * Payer subscribes to payment-specific updates
   * Called when checkout wants to listen to a specific payment's status
   */
  @SubscribeMessage('subscribe:payment')
  async handlePaymentSubscribe(
    client: Socket,
    paymentId: string,
  ): Promise<{ subscribed: boolean; payment: string }> {
    const context = this.socketContextMap.get(client.id);

    // Validate that the client is authenticated as payment subscriber
    // and is watching the correct payment
    if (!context || context.type !== 'payment' || context.paymentId !== paymentId) {
      throw new WsException(
        'Unauthorized - cannot subscribe to other payment events',
      );
    }

    // Ensure client is in the payment room
    client.join(`payment:${paymentId}`);

    this.logger.log(
      `Client subscribed to payment ${paymentId} updates (SocketId: ${client.id})`,
    );

    return {
      subscribed: true,
      payment: paymentId,
    };
  }

  /**
   * Validate dashboard authentication via JWT token
   * Returns the merchant ID if valid
   *
   * @param token - JWT token from handshake
   * @throws WsException if token is invalid
   */
  private async validateDashboardAuth(token: string): Promise<string> {
    try {
      // Extract bearer token if needed
      const jwtToken = token.replace('Bearer ', '').replace('bearer ', '');

      // Verify JWT signature and expiry
      const payload = await this.jwtService.verifyAsync(jwtToken);

      if (!payload.sub || payload.type !== 'access') {
        throw new Error('Invalid token payload');
      }

      // Verify merchant exists
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: payload.sub },
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      return merchant.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Dashboard auth validation failed: ${message}`);
      throw new WsException(`Authentication failed: ${message}`);
    }
  }

  /**
   * Validate checkout authentication
   * Can use either a payment session token or just the paymentId
   * (For MVP, we accept paymentId; in production, validate a session token)
   *
   * @param paymentId - The payment ID from connection params
   * @param sessionToken - Optional session token for future validation
   * @throws WsException if payment doesn't exist or is invalid
   */
  private async validateCheckoutAuth(
    paymentId: string,
    sessionToken?: string,
  ): Promise<{ id: string; merchantId: string }> {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      // In production, validate sessionToken against a session store
      // For now, we just verify the payment exists
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, merchantId: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Checkout auth validation failed: ${message}`);
      throw new WsException(`Authentication failed: ${message}`);
    }
  }
}
