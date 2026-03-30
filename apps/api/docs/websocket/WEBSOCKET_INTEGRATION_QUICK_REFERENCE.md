# WebSocket Integration Quick Reference

## 5-Minute Integration Guide

### Step 1: Import EventsService
```typescript
import { EventsService } from '../events/events/events.service';
```

### Step 2: Inject into Service
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly eventsService: EventsService, // Add this line
  // ... other dependencies
) {}
```

### Step 3: Import EventsModule in Your Module
```typescript
// your.module.ts
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,  // Add this
    // ... other imports
  ],
  providers: [YourService],
  exports: [YourService],
})
export class YourModule {}
```

### Step 4: Emit Events When Status Changes

**For Payments (Already Done):**
```typescript
await this.eventsService.emitPaymentStatus(
  paymentId,
  merchantId,
  status,
  {
    sourceTxHash: payment.sourceTxHash || undefined,
    stellarTxHash: payment.stellarTxHash || undefined,
    destAmount: payment.destAmount?.toString(),
    destAsset: payment.destAsset,
    updatedAt: payment.updatedAt,
  },
);
```

**For Payouts:**
```typescript
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
  },
);
```

**For Links:**
```typescript
await this.eventsService.emitLinkPaid(
  merchantId,
  linkId,
  paymentId,
  {
    amount: payment.destAmount.toString(),
    currency: 'USD',
    sourceAsset: payment.sourceAsset,
    sourceChain: payment.sourceChain,
    completedAt: new Date(),
  },
);
```

**For Invoices:**
```typescript
await this.eventsService.emitInvoicePaid(
  merchantId,
  invoiceId,
  paymentId,
  invoice.total.toString(),
);
```

**For Webhooks:**
```typescript
await this.eventsService.emitWebhookDelivery(
  merchantId,
  webhookEvent, // WebhookEvent object from Prisma
);
```

---

## Event Data Reference

### Payment Status Event
```typescript
{
  paymentId: string;     // e.g., "pay_abc123"
  status: string;        // e.g., "COMPLETED", "PENDING", "FAILED"
  updatedAt: Date;       // ISO timestamp
  destAmount?: string;   // e.g., "100.00"
  destAsset?: string;    // e.g., "USDC"
  stellarTxHash?: string;
  sourceTxHash?: string;
  destTxHash?: string;
  reason?: string;       // For FAILED status
}
```

### Payout Status Event
```typescript
{
  payoutId: string;          // e.g., "payout_xyz789"
  status: string;            // "COMPLETED", "PENDING", "FAILED"
  amount?: string;           // e.g., "500.00"
  currency?: string;         // e.g., "USD"
  stellarTxHash?: string;
  failureReason?: string;
  updatedAt: Date;           // ISO timestamp
}
```

### Link Paid Notification
```typescript
{
  linkId: string;       // Payment link ID
  paymentId: string;    // Payment that paid this link
  amount?: string;      // Amount paid
  currency?: string;    // e.g., "USD"
  sourceAsset?: string; // e.g., "USDC"
  sourceChain?: string; // e.g., "stellar"
  completedAt: Date;    // ISO timestamp
}
```

### Invoice Paid Notification
```typescript
{
  invoiceId: string;
  paymentId: string;
  amount?: string;      // Invoice total
}
```

### WebhookDelivery Event
```typescript
{
  id: string;       // WebhookEvent ID
  eventType: string;
  status: string;   // "PENDING", "DELIVERED", "FAILED"
  attempts: number;
  createdAt: Date;
}
```

---

## Event Flow Diagram

```
┌─────────────────┐
│   Service       │
│  (Payments,     │
│   Payouts, etc) │
└────────┬────────┘
         │
         │ calls emitPaymentStatus()
         │
         ▼
┌─────────────────────────┐
│   EventsService         │
│  (event-routing layer)  │
└────────┬────────────────┘
         │
         │ emits to rooms
         │
    ┌────┴────────┬──────────────────┐
    │             │                  │
    ▼             ▼                  ▼
merchant:{id} payment:{id}    payout:{id}
    │             │                  │
    │  broadcasts │broadcuasts      │ broadcasts
    │             │                  │
    ▼             ▼                  ▼
 Dashboard    Checkout          Dashboard
(all events) (payment only)     (all events)
```

---

## Client Usage Example

### Dashboard (React)
```typescript
useEffect(() => {
  const socket = io(API_URL, {
    query: {
      type: 'merchant',
      token: `Bearer ${jwt}`,
    },
  });

  socket.on('message', (event) => {
    if (event.event === 'payment:status') {
      console.log(`Payment ${event.data.paymentId} → ${event.data.status}`);
      // Update UI
    }
  });

  return () => socket.disconnect();
}, []);
```

### Checkout (React)
```typescript
useEffect(() => {
  const socket = io(API_URL, {
    query: {
      type: 'payment',
      paymentId: paymentId,
    },
  });

  socket.on('message', (event) => {
    if (event.event === 'payment:status') {
      setPaymentStatus(event.data.status);
      if (event.data.status === 'COMPLETED') {
        setSuccessMessage(`Payment completed with hash ${event.data.stellarTxHash}`);
      }
    }
  });

  return () => socket.disconnect();
}, [paymentId]);
```

---

## Common Patterns

### Update Status and Emit Event
```typescript
async updatePayoutStatus(payoutId: string, newStatus: string) {
  // Update database
  const payout = await this.prisma.payout.update({
    where: { id: payoutId },
    data: { status: newStatus },
  });

  // Emit event (automatically broadcasts)
  this.eventsService.emitPayoutStatus(
    payout.merchantId,
    payoutId,
    newStatus,
    {
      amount: payout.amount.toString(),
      currency: payout.currency,
      updatedAt: payout.updatedAt,
    },
  );

  return payout;
}
```

### Transaction with Event
```typescript
async completePayment(paymentId: string) {
  const payment = await this.prisma.$transaction(async (tx) => {
    // Update payment
    const p = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Trigger webhook (external)
    await this.webhooksService.dispatch(
      p.merchantId,
      'payment.completed',
      p,
    );

    return p;
  });

  // Emit WebSocket event AFTER transaction completes
  this.eventsService.emitPaymentStatus(
    paymentId,
    payment.merchantId,
    'COMPLETED',
    {
      destAmount: payment.destAmount.toString(),
      destAsset: payment.destAsset,
      updatedAt: payment.updatedAt,
    },
  );

  return payment;
}
```

---

## Error Handling

All emit methods are null-safe and log errors instead of throwing:

```typescript
// This won't throw even if gateway is undefined
this.eventsService.emitPaymentStatus(
  paymentId,
  merchantId,
  status,
  data
);

// Check logs for any errors
// [EventsService] Failed to emit payment status: ...
```

---

## Testing

### Mock EventsService
```typescript
const mockEventsService = {
  emitPaymentStatus: jest.fn(),
  emitPayoutStatus: jest.fn(),
  emitLinkPaid: jest.fn(),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    YourService,
    {
      provide: EventsService,
      useValue: mockEventsService,
    },
  ],
}).compile();

// In your test
it('should emit payment status', async () => {
  await service.updateStatus('pay_123', 'COMPLETED');

  expect(mockEventsService.emitPaymentStatus).toHaveBeenCalledWith(
    'pay_123',
    'merchant_123',
    'COMPLETED',
    expect.any(Object),
  );
});
```

---

## Checklist for New Integration

- [ ] Import EventsService
- [ ] Inject in constructor
- [ ] Add EventsModule to module imports
- [ ] Call emit method on status change
- [ ] Include relevant transaction data
- [ ] Handle errors gracefully
- [ ] Test with console logs
- [ ] Verify dashboard receives messages
- [ ] Verify checkout receives messages
- [ ] Document emit points in comments

---

## Support

For more details, see:
- `WEBSOCKET_IMPLEMENTATION.md` - Complete guide
- `apps/api/src/modules/events/events/events.service.ts` - Method documentation
- `apps/api/src/modules/payments/payments.service.ts` - Working example
