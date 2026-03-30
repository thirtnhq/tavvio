# WebSocket Events Gateway - Implementation Guide

## Overview

The WebSocket Events Gateway enables real-time updates for:
- **Dashboard**: Merchant monitoring transactions, payouts, and notifications
- **Checkout**: Payer watching their payment status without polling

The gateway uses JWT authentication for dashboard connections and session-based auth for checkout connections.

## Architecture

### Room Structure

Events are routed to specific rooms:
- `merchant:{merchantId}` - All events for a merchant (dashboard listens)
- `payment:{paymentId}` - Status updates for a specific payment (checkout listens)
- `payout:{payoutId}` - Payout status updates
- Custom rooms can be added as needed

### Authentication Flow

**Dashboard Connection:**
```
?type=merchant&token=Bearer%20eyJhbGc...
```
- JWT token validated against `process.env.JWT_SECRET`
- Automatically joins `merchant:{merchantId}` room
- Receives all merchant-scoped events

**Checkout Connection:**
```
?type=payment&paymentId=pay_123&sessionToken=...
```
- Payment ID lookup to verify payment exists
- No merchant auth needed
- Payer only sees their own payment updates
- Automatically joins `payment:{paymentId}` room

## Files Implemented

### 1. `apps/api/src/modules/events/events/events.gateway.ts`
WebSocket gateway handling connections and subscriptions.

**Key Features:**
- CORS configured for dashboard and checkout origins
- JWT validation for dashboard connections
- Payment validation for checkout connections
- Automatic room subscription on connect
- Context cleanup on disconnect
- WsException for auth failures

**Methods:**
- `handleConnection(client)` - Authenticates and subscribes clients
- `handleDisconnect(client)` - Cleans up socket context
- `handleMerchantSubscribe(client, merchantId)` - Dashboard subscription
- `handlePaymentSubscribe(client, paymentId)` - Checkout subscription

### 2. `apps/api/src/modules/events/events/events.service.ts`
Injection service for emitting events from other modules.

**Methods:**
- `emitPaymentStatus(paymentId, merchantId, status, data?)` - Payment status updates
- `emitWebhookDelivery(merchantId, webhookEvent)` - Webhook delivery logs
- `emitPayoutStatus(merchantId, payoutId, status, data?)` - Payout updates
- `emitLinkPaid(merchantId, linkId, paymentId, data?)` - Link paid notifications
- `emitInvoicePaid(merchantId, invoiceId, paymentId, amount?)` - Invoice paid notifications

### 3. `apps/api/src/modules/events/events.module.ts`
Module registration with JwtModule and PrismaModule imports.

Exports both `EventsGateway` and `EventsService` for use in other modules.

## Integration Examples

### PaymentsService - Already Integrated ✅

Payment status updates are emitted automatically:

```typescript
// In PaymentsService.updateStatus()
this.eventsService.emitPaymentStatus(
  paymentId,
  merchantId,
  status,
  {
    sourceTxHash: payment.sourceTxHash,
    stellarTxHash: payment.stellarTxHash,
    destAmount: payment.destAmount.toString(),
    destAsset: payment.destAsset,
    updatedAt: payment.updatedAt,
  }
);
```

### WebhooksService - Add Webhook Delivery Events

```typescript
import { EventsService } from '../events/events/events.service';

// In WebhooksService constructor:
constructor(
  private readonly prisma: PrismaService,
  @InjectQueue(WEBHOOK_QUEUE_NAME) private readonly webhookQueue: Queue,
  private readonly eventsService: EventsService, // Add this
) {}

// After webhook is delivered/failed:
await this.eventsService.emitWebhookDelivery(
  event.merchantId,
  event
);
```

### LinksService - Add Link Paid Events

```typescript
import { EventsService } from '../events/events/events.service';

// In LinksService, when a link is marked as paid:
await this.eventsService.emitLinkPaid(
  merchantId,
  linkId,
  paymentId,
  {
    amount: payment.destAmount.toString(),
    currency: 'USD', // or derived from payment
    sourceAsset: payment.sourceAsset,
    sourceChain: payment.sourceChain,
    completedAt: new Date(),
  }
);
```

### PayoutsService - Add Payout Status Events

```typescript
import { EventsService } from '../events/events/events.service';

// In PayoutsService, when updating payout status:
await this.eventsService.emitPayoutStatus(
  merchantId,
  payoutId,
  status,
  {
    amount: payout.amount.toString(),
    currency: payout.currency,
    stellarTxHash: payout.stellarTxHash || undefined,
    failureReason: payout.failureReason || undefined,
    updatedAt: payout.updatedAt,
  }
);
```

### InvoicesService - Add Invoice Paid Events

```typescript
import { EventsService } from '../events/events/events.service';

// In InvoicesService, when an invoice is paid:
await this.eventsService.emitInvoicePaid(
  merchantId,
  invoiceId,
  paymentId,
  invoice.total.toString()
);
```

## Client Implementation

### Dashboard (Next.js)

```typescript
import { io } from 'socket.io-client';

// Connect to WebSocket with JWT
const socket = io(process.env.REACT_APP_API_URL, {
  query: {
    type: 'merchant',
    token: `Bearer ${accessToken}`,
  },
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
});

// Listen for merchant events
socket.on('message', (event: any) => {
  if (event.event === 'payment:status') {
    console.log('Payment updated:', event.data);
    // Update dashboard state
  }
  if (event.event === 'payout:status') {
    console.log('Payout updated:', event.data);
  }
  if (event.event === 'notification') {
    console.log('Notification:', event.data);
  }
});
```

### Checkout (React)

```typescript
import { io } from 'socket.io-client';

// Connect to WebSocket as payment subscriber
const socket = io(process.env.REACT_APP_API_URL, {
  query: {
    type: 'payment',
    paymentId: paymentId,
    // Optional: sessionToken: paymentSessionToken,
  },
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
});

// Listen for payment updates
socket.on('message', (event: any) => {
  if (event.event === 'payment:status') {
    const { status, stellarTxHash, destAmount, destAsset } = event.data;

    switch (status) {
      case 'PENDING':
        showWaitingForPayment();
        break;
      case 'SOURCE_LOCKED':
        showSourceLockedMessage();
        break;
      case 'COMPLETED':
        showSuccessScreen(stellarTxHash, destAmount, destAsset);
        break;
      case 'FAILED':
        showFailureScreen(event.data.reason);
        break;
    }
  }
});
```

## Event Payloads

### Payment Status Event

```json
{
  "event": "payment:status",
  "data": {
    "paymentId": "pay_123",
    "status": "COMPLETED",
    "updatedAt": "2024-01-15T10:30:00Z",
    "destAmount": "100.00",
    "destAsset": "USDC",
    "stellarTxHash": "abc123...",
    "sourceTxHash": "xyz789...",
    "destTxHash": "def456..."
  }
}
```

### Notification Event

```json
{
  "event": "notification",
  "data": {
    "type": "link_paid | invoice_paid | payout_completed",
    "title": "Payment Link Completed",
    "message": "Link payment received successfully",
    "resourceId": "link_123",
    "paymentId": "pay_123",
    "amount": "100.00",
    "completedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Payout Status Event

```json
{
  "event": "payout:status",
  "data": {
    "payoutId": "payout_123",
    "status": "COMPLETED",
    "amount": "500.00",
    "currency": "USD",
    "stellarTxHash": "abc123...",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Configuration

### Environment Variables

Ensure these are set in `.env`:
- `JWT_SECRET` - Used for JWT validation (default: 'fallback-dev-secret')
- `DASHBOARD_URL` - CORS origin for dashboard (default: http://localhost:3001)
- `CHECKOUT_URL` - CORS origin for checkout (default: http://localhost:3002)
- `REDIS_URL` - Required for BullMQ (already configured)

### NestJS Configuration

The gateway is automatically registered when `EventsModule` is imported. Check:
- `apps/api/src/app.module.ts` - EventsModule is imported ✅
- `apps/api/src/modules/events/events.module.ts` - Exports EventsGateway and EventsService ✅

## Testing

### Manual Testing with Socket.io Client

```bash
npm install -g socket.io-cli
```

**Dashboard Test:**
```bash
socket.io-client ws://localhost:3000 --query "type=merchant&token=Bearer+eyJhbGc..."
```

**Checkout Test:**
```bash
socket.io-client ws://localhost:3000 --query "type=payment&paymentId=pay_123"
```

### Unit Tests

The `events.gateway.spec.ts` file provides a basic template. Extend it to test:
- JWT validation
- Payment lookup validation
- Room subscriptions
- Message emissions
- Disconnect cleanup

## Performance Considerations

- **Message Broadcasting**: Events are emitted using socket.io rooms, which uses in-memory storage. For horizontal scaling, configure socket.io with Redis adapter.
- **Connection Limit**: Default socket.io configuration supports thousands of concurrent connections
- **Latency Target**: < 500ms from database update to client notification

## Troubleshooting

### Clients Not Receiving Messages

1. **Check Connection**: Ensure client connects with correct `type` and `token`/`paymentId`
2. **CORS Issues**: Verify `DASHBOARD_URL` and `CHECKOUT_URL` environment variables
3. **Room Subscription**: Client must be in correct room (`merchant:{id}` or `payment:{id}`)

### Authentication Failures

1. **Invalid JWT**: Check token signature and expiration
2. **Merchant Not Found**: Verify merchantId in token matches a real merchant
3. **Payment Not Found**: Verify paymentId exists in database

### Missing Events

1. **Service Not Injected**: Verify EventsService is injected in the calling service
2. **Gateway Not Initialized**: Ensure server socket is available before emitting
3. **Error Handling**: Check logs for exceptions in emit calls

## Future Enhancements

1. **Redis Adapter** - For horizontal scaling across multiple instances
2. **Message Acknowledgment** - Guarantee client received message
3. **Rate Limiting** - Prevent spam/DoS attacks
4. **Event Filtering** - Allow clients to filter events they care about
5. **Presence** - Track which users are online
6. **Typing Indicators** - For real-time collaboration features
7. **Automated Recovery** - Automatic reconnection and state sync for disconnected clients
