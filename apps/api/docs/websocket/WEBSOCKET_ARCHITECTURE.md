# WebSocket Events Gateway - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Dashboard (React)              Checkout (React)            │
│  ├─ JWT Auth                    ├─ Payment Session          │
│  └─ ws://api?type=merchant      └─ ws://api?type=payment   │
│                                                               │
└──────────────────────────┬────────────────────────────────────┘
                           │
                    WebSocket Connection
                           │
        ┌──────────────────────────────────────────────┐
        │   Socket.io WebSocket Server                 │
        │   ├─ CORS: [dashboard, checkout]            │
        │   ├─ Port: 3000                             │
        │   └─ Transports: WebSocket + Polling        │
        └──────┬───────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │ EventsGateway  │
       │                │
       │ Responsibility:
       │ ├─ Authenticate
       │ ├─ Route to rooms
       │ └─ Manage connections
       └───────┬────────┘
               │
       ┌───────▼──────────┐
       │ EventsService    │
       │                  │
       │ Broadcasts to:
       │ ├─ merchant:{id} (Dashboard)
       │ ├─ payment:{id}  (Checkout)
       │ └─ payout:{id}   (Optional)
       └──────────────────┘


                    Room Broadcasting

┌─────────────────────────────────────────────────────────────┐
│  Socket.io Rooms                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  merchant:merchant-123                                     │
│  ├─ Dashboard Client 1 ────────────────┐                  │
│  ├─ Dashboard Client 2 ────────────────┼─→ All Events    │
│  └─ Dashboard Client N ────────────────┘                  │
│                                                             │
│  payment:pay-456                                           │
│  ├─ Checkout Client 1 ─────────────────┐                  │
│  └─ Checkout Client 2 ─────────────────┼─→ Payment       │
│     (Same payer, different browser)    │    Events Only  │
│                                                             │
│  payout:payout-789                                         │
│  └─ Dashboard Client 1 ─────────────────→ Payout Events  │
│                                                             │
└─────────────────────────────────────────────────────────────┘


          Event Flow From Services

┌──────────────────────────────────────────────────────────┐
│               Service Modules                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PaymentsService ──┐                                    │
│  ├─ Status Update  │                                    │
│  └─ updateStatus() │                                    │
│                    ├──→ EventsService ──→ Emit Event    │
│  WebhooksService ──┤    ├─ emitPaymentStatus()         │
│  └─ dispatch()     │    ├─ emitPayoutStatus()          │
│                    ├──→ ├─ emitWebhookDelivery()       │
│  LinksService ─────┤    ├─ emitLinkPaid()              │
│  ├─ Mark as paid   │    └─ emitInvoicePaid()            │
│  └─ onPayment()    │                                    │
│                    │                                    │
│  PayoutsService ───┘                                    │
│  └─ onStatusChange()                                    │
│                                                          │
│  InvoicesService                                        │
│  └─ onPaid()                                            │
│                                                          │
└──────────────────────────────────────────────────────────┘


     Authentication Flow

┌─ Dashboard ──────────────────────┐
│ 1. Get JWT from /auth/login      │
│ 2. Connect:                      │
│    ws://api?type=merchant&token= │
│       Bearer {JWT}               │
│ 3. Gateway validates with        │
│    JwtService.verifyAsync()      │
│ 4. Checks merchant in DB         │
│ 5. Joins room merchant:{id}      │
└──────────────────────────────────┘

┌─ Checkout ───────────────────────┐
│ 1. Get paymentId from URL        │
│ 2. Connect:                      │
│    ws://api?type=payment&        │
│       paymentId={ID}             │
│ 3. Gateway validates with        │
│    PrismaService.payment.find()  │
│ 4. Joins room payment:{id}       │
│ 5. Watches status updates        │
└──────────────────────────────────┘


    Event Payload Example

Payment Status Event:
{
  event: "payment:status",
  data: {
    paymentId: "pay_abc123",
    status: "COMPLETED",
    updatedAt: "2024-03-30T15:45:30Z",
    destAmount: "100.00",
    destAsset: "USDC",
    stellarTxHash: "abc123...",
    sourceTxHash: "xyz789..."
  }
}

Notification Event:
{
  event: "notification",
  data: {
    type: "link_paid",
    title: "Payment Link Completed",
    message: "...",
    resourceId: "link_123",
    paymentId: "pay_123"
  }
}


     Deployment Architecture

┌──────────────────────────────────────────────┐
│      Production Deployment Options           │
├──────────────────────────────────────────────┤
│                                              │
│  Single Instance (Current)                  │
│  ├─ Socket.io in-memory routing             │
│  ├─ 1000+ concurrent connections            │
│  └─ No additional setup needed               │
│                                              │
│  With Redis Adapter (Scaling)                │
│  ├─ Add socket.io-redis                     │
│  ├─ Multiple instances supported             │
│  ├─ Messages routed via Redis               │
│  └─ Unlimited horizontal scaling             │
│                                              │
│  Connection Flow:                            │
│  ├─ App → Socket.io → Redis → other instances
│  └─ All instances see same events           │
│                                              │
└──────────────────────────────────────────────┘
