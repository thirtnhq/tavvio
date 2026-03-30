# Webhook Delivery System - Implementation Summary

## Overview
A complete webhook delivery system with retry logic has been successfully implemented for the Useroutr platform. This allows merchants to receive real-time notifications when payments and other events occur.

## Files Created/Modified

### Core Implementation Files

#### 1. **webhooks.constants.ts** - Constants and Configuration
- Event types: `payment.pending`, `payment.processing`, `payment.completed`, `payment.failed`, etc.
- Retry delays: Exponential backoff (30s, 2min, 15min, 1hr, 4hr)
- Max attempts: 5
- Request timeout: 10 seconds

#### 2. **webhooks.types.ts** - TypeScript Types
- `WebhookJobData` - BullMQ job data structure
- `WebhookConfig` - Webhook configuration interface
- `WebhookLogFilters` - Filter options for logs
- `PaginatedResult<T>` - Pagination wrapper

#### 3. **webhooks.util.ts** - Utility Functions
- `signWebhookPayload()` - HMAC-SHA256 signing function
- `verifyWebhookSignature()` - Signature verification function

#### 4. **dto/index.ts** - Data Transfer Objects
- `RegisterWebhookDto` - Register new webhook
- `UpdateWebhookDto` - Update webhook configuration
- `WebhookEventResponseDto` - Response DTO for events
- `WebhookLogFiltersDto` - Filter DTO for logs

#### 5. **webhooks.service.ts** - Core Service
Methods:
- `register()` - Register webhook URL + events
- `update()` - Update webhook configuration
- `getConfig()` - Retrieve current configuration
- `dispatch()` - Create event & enqueue delivery job
- `getDeliveryLogs()` - Query delivery history with filters
- `retryEvent()` - Manually retry failed delivery
- `getPendingCount()` - Get pending webhook count
- `getEventDetails()` - Helper for authorization

Features:
- Auto-generates webhook secret (32 bytes, hex-encoded)
- Validates event types
- Creates WebhookEvent records in database
- Enqueues BullMQ jobs for async delivery

#### 6. **webhooks.processor.ts** - BullMQ Worker
- Extends `WorkerHost` for async job processing
- Handles webhook delivery with retry logic
- Signs payloads with HMAC-SHA256
- Sends POST requests with `Useroutr-Signature` header
- Manages retry scheduling with exponential backoff
- Updates event status: PENDING → DELIVERED/FAILED → EXHAUSTED

#### 7. **webhooks.controller.ts** - REST API
Endpoints:
- `POST /v1/webhooks` - Register webhook (JWT protected)
- `GET /v1/webhooks` - Get configuration (JWT protected)
- `PATCH /v1/webhooks` - Update configuration (JWT protected)
- `GET /v1/webhooks/logs` - Query logs with filters (JWT protected)
- `POST /v1/webhooks/logs/:id/retry` - Retry failed delivery (JWT protected)

#### 8. **webhooks.module.ts** - NestJS Module
- Imports BullMQ with webhook queue
- Registers WebhooksService and WebhooksProcessor
- Exports WebhooksService for other modules

#### 9. **prisma/seed.ts** - Bug Fix
- Fixed import path from `'../generated/prisma/client'` to `'@prisma/client'`

## Database Schema

### WebhookEvent Model
```prisma
model WebhookEvent {
  id            String        @id @default(cuid())
  merchantId    String
  paymentId     String?
  eventType     String
  payload       Json
  status        WebhookStatus @default(PENDING)
  attempts      Int           @default(0)
  lastAttemptAt DateTime?
  nextRetryAt   DateTime?
  createdAt     DateTime      @default(now())
  payment       Payment?      @relation(fields: [paymentId], references: [id])
}

enum WebhookStatus {
  PENDING
  DELIVERED
  FAILED
  EXHAUSTED
}
```

## Retry Strategy

### Exponential Backoff Schedule
| Attempt | Delay | Total Wait |
|---------|-------|-----------|
| 1       | 30s   | 30s       |
| 2       | 2m    | 2m30s     |
| 3       | 15m   | 17m30s    |
| 4       | 1h    | 1h17m30s  |
| 5       | 4h    | 5h17m30s  |

### Lifecycle
1. Event dispatched → PENDING
2. Delivery attempt → FAILED (if non-2xx)
3. After 5 failures → EXHAUSTED (stops retrying)
4. Successful delivery (2xx) → DELIVERED

## Webhook Signature

### Header Format
```
Useroutr-Signature: sha256=<hex>
```

### Example
```
sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Usage Flow

### 1. Merchant Registers Webhook
```bash
POST /v1/webhooks
{
  "webhookUrl": "https://merchant.com/webhooks",
  "subscribedEvents": ["payment.completed", "payment.failed"]
}
```

Response:
```json
{
  "webhookUrl": "https://merchant.com/webhooks",
  "subscribedEvents": ["payment.completed", "payment.failed"],
  "webhookSecret": "..." // 64-char hex string (returned one-time only)
}
```

### 2. Event Occurs
Payment service calls:
```typescript
await webhooksService.dispatch(
  merchantId,
  'payment.completed',
  paymentData,
  paymentId
);
```

### 3. Automatic Delivery
- WebhooksProcessor picks up the job
- Signs payload with merchant's webhookSecret
- POSTs to webhookUrl with Useroutr-Signature header
- On failure: retries with exponential backoff
- Max 5 attempts before marking EXHAUSTED

### 4. Merchant Verification
```typescript
import crypto from 'crypto';

const signature = request.headers['useroutr-signature'];
const body = request.rawBody; // Must use raw body, not parsed JSON

function verify(body, signature, secret) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 5. Query Logs
```bash
GET /v1/webhooks/logs?status=FAILED&startDate=2026-03-30&limit=50
```

### 6. Retry Failed Event
```bash
POST /v1/webhooks/logs/:eventId/retry
```

## Integration with Payments Module

The WebhooksService is already integrated into the PaymentsService and is called when payment status changes:

```typescript
await this.webhooksService.dispatch(
  updatedPayment.merchantId,
  `payment.${status.toLowerCase()}`,
  updatedPayment,
  updatedPayment.id,
);
```

## Security Features

1. **HMAC-SHA256 Signing** - Payload integrity verification
2. **Webhook Secret** - Randomly generated per merchant (32 bytes)
3. **JWT Authentication** - All endpoints require valid JWT
4. **Timeout Protection** - 10-second timeout per request
5. **Timing-safe Comparison** - Prevents timing attacks on signature verification

## Monitoring & Debugging

### Pending Webhooks Count
```typescript
const count = await webhooksService.getPendingCount(merchantId);
```

### Event Details
```typescript
const event = await webhooksService.getEventDetails(merchantId, eventId);
```

### Log Queries
```typescript
const logs = await webhooksService.getDeliveryLogs(merchantId, {
  status: 'FAILED',
  startDate: new Date('2026-03-30'),
  endDate: new Date('2026-03-31'),
  limit: 100,
  offset: 0
});
```

## Acceptance Criteria ✅

- ✅ Merchants can register a webhook URL and select event types
- ✅ dispatch() creates a DB record and enqueues a BullMQ job
- ✅ Payloads are signed with HMAC-SHA256 and include Useroutr-Signature header
- ✅ Successful delivery (2xx) marks event as DELIVERED
- ✅ Failed delivery retries with exponential backoff (5 attempts max)
- ✅ Exhausted events stop retrying and are marked EXHAUSTED
- ✅ Delivery logs are queryable with filters (status, eventType, date range)
- ✅ Manual retry re-enqueues a failed/exhausted event

## Build Status
✅ Successfully compiled and integrated with the API

## Next Steps

1. Run `npm run start:dev` to start the API with webhook processing
2. Redis must be running for BullMQ queue processing
3. Test webhook registration via POST /v1/webhooks
4. Trigger a payment to test event dispatch
5. Monitor logs via GET /v1/webhooks/logs
