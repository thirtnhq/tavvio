import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean existing data (order matters due to FK constraints)
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.paymentLink.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.merchant.deleteMany();

  // ── Merchants ────────────────────────────────────────────────

  const apiKeyHash1 = await hash('sk_test_acme_corp_api_key_001', 10);
  const apiKeyHash2 = await hash('sk_test_globex_api_key_002', 10);
  const apiKeyHash3 = await hash('sk_test_initech_api_key_003', 10);

  const acme = await prisma.merchant.create({
    data: {
      name: 'Acme Corp',
      email: 'admin@acmecorp.com',
      passwordHash: await hash('acme_password_123', 10),
      apiKeyHash: apiKeyHash1,
      webhookUrl: 'https://acmecorp.com/webhooks/tavvio',
      webhookSecret: 'whsec_acme_test_secret',
      settlementAsset: 'USDC',
      settlementAddress:
        'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AHDKSTEBKHL5USQV7IRG3OVRRM',
      settlementChain: 'stellar',
      kybStatus: 'APPROVED',
      feeBps: 50,
    },
  });

  const globex = await prisma.merchant.create({
    data: {
      name: 'Globex International',
      email: 'payments@globex.io',
      passwordHash: await hash('globex_password_456', 10),
      apiKeyHash: apiKeyHash2,
      webhookUrl: 'https://globex.io/api/webhooks',
      webhookSecret: 'whsec_globex_test_secret',
      settlementAsset: 'USDC',
      settlementAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      settlementChain: 'ethereum',
      kybStatus: 'APPROVED',
      feeBps: 40,
    },
  });

  const initech = await prisma.merchant.create({
    data: {
      name: 'Initech Solutions',
      email: 'finance@initech.dev',
      passwordHash: await hash('initech_password_789', 10),
      apiKeyHash: apiKeyHash3,
      settlementAsset: 'USDC',
      settlementAddress:
        'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG',
      settlementChain: 'stellar',
      kybStatus: 'PENDING',
      feeBps: 60,
    },
  });

  console.log(
    `Created merchants: ${acme.name}, ${globex.name}, ${initech.name}`,
  );

  // ── Team Members ─────────────────────────────────────────────

  await prisma.teamMember.createMany({
    data: [
      { merchantId: acme.id, email: 'admin@acmecorp.com', role: 'OWNER' },
      { merchantId: acme.id, email: 'dev@acmecorp.com', role: 'DEVELOPER' },
      { merchantId: acme.id, email: 'finance@acmecorp.com', role: 'FINANCE' },
      { merchantId: globex.id, email: 'payments@globex.io', role: 'OWNER' },
      { merchantId: globex.id, email: 'cto@globex.io', role: 'ADMIN' },
      { merchantId: initech.id, email: 'finance@initech.dev', role: 'OWNER' },
    ],
  });

  console.log('Created team members');

  // ── Quotes ───────────────────────────────────────────────────

  const now = new Date();
  const thirtySecsLater = new Date(now.getTime() + 30_000);
  const expired = new Date(now.getTime() - 60_000);

  const quotes = await Promise.all([
    // Active quote – ETH → USDC via wormhole
    prisma.quote.create({
      data: {
        fromChain: 'ethereum',
        fromAsset: 'ETH',
        fromAmount: '0.5',
        toChain: 'stellar',
        toAsset: 'USDC',
        toAmount: '975.00',
        rate: '1950.00',
        feeBps: 50,
        feeAmount: '4.875',
        bridgeRoute: 'wormhole',
        expiresAt: thirtySecsLater,
      },
    }),
    // Active quote – USDC on Stellar path payment
    prisma.quote.create({
      data: {
        fromChain: 'stellar',
        fromAsset: 'XLM',
        fromAmount: '10000',
        toChain: 'stellar',
        toAsset: 'USDC',
        toAmount: '1200.00',
        rate: '0.12',
        feeBps: 50,
        feeAmount: '6.00',
        stellarPath: ['XLM', 'yUSDC', 'USDC'],
        expiresAt: thirtySecsLater,
      },
    }),
    // Used quote
    prisma.quote.create({
      data: {
        fromChain: 'ethereum',
        fromAsset: 'USDC',
        fromAmount: '500.00',
        toChain: 'stellar',
        toAsset: 'USDC',
        toAmount: '497.50',
        rate: '1.00',
        feeBps: 50,
        feeAmount: '2.50',
        bridgeRoute: 'cctp',
        expiresAt: expired,
        used: true,
      },
    }),
    // Expired quote
    prisma.quote.create({
      data: {
        fromChain: 'polygon',
        fromAsset: 'USDT',
        fromAmount: '1000.00',
        toChain: 'stellar',
        toAsset: 'USDC',
        toAmount: '996.00',
        rate: '0.999',
        feeBps: 40,
        feeAmount: '3.99',
        bridgeRoute: 'layerswap',
        expiresAt: expired,
      },
    }),
  ]);

  console.log(`Created ${quotes.length} quotes`);

  // ── Payments ─────────────────────────────────────────────────

  // We need additional quotes for the payments that need unique quoteIds
  const paymentQuotes = await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      prisma.quote.create({
        data: {
          fromChain: i % 2 === 0 ? 'ethereum' : 'stellar',
          fromAsset: i % 2 === 0 ? 'USDC' : 'XLM',
          fromAmount: String(100 + i * 50),
          toChain: 'stellar',
          toAsset: 'USDC',
          toAmount: String(99 + i * 49),
          rate: i % 2 === 0 ? '1.00' : '0.12',
          feeBps: 50,
          feeAmount: String((100 + i * 50) * 0.005),
          bridgeRoute: i % 2 === 0 ? 'cctp' : null,
          stellarPath: i % 2 !== 0 ? ['XLM', 'USDC'] : undefined,
          expiresAt: expired,
          used: true,
        },
      }),
    ),
  );

  const statuses = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'PROCESSING',
    'PROCESSING',
    'STELLAR_LOCKED',
    'SOURCE_LOCKED',
    'QUOTE_LOCKED',
    'PENDING',
    'PENDING',
    'FAILED',
    'REFUNDED',
    'EXPIRED',
    'COMPLETED',
  ] as const;

  const payments = await Promise.all(
    paymentQuotes.map((q, i) => {
      const status = statuses[i];
      const merchantId =
        i % 3 === 0 ? acme.id : i % 3 === 1 ? globex.id : initech.id;
      const isComplete = status === 'COMPLETED';

      return prisma.payment.create({
        data: {
          merchantId,
          quoteId: q.id,
          status,
          sourceChain: q.fromChain,
          sourceAsset: q.fromAsset,
          sourceAmount: q.fromAmount,
          sourceAddress:
            i % 2 === 0
              ? '0xdAC17F958D2ee523a2206206994597C13D831ec7'
              : 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBD3XCDGYOO5SS',
          sourceTxHash: isComplete
            ? `0x${i.toString(16).padStart(64, 'a')}`
            : undefined,
          stellarTxHash: isComplete
            ? `stellar_tx_${i}_${Date.now()}`
            : undefined,
          destChain: 'stellar',
          destAsset: 'USDC',
          destAmount: q.toAmount,
          destAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AHDKSTEBKHL5USQV7IRG3OVRRM',
          destTxHash: isComplete ? `stellar_dest_tx_${i}` : undefined,
          hashlock: `sha256_hashlock_${i.toString(16).padStart(64, '0')}`,
          secretRevealed: isComplete,
          metadata: {
            orderId: `ORD-${1000 + i}`,
            customerEmail: `customer${i}@example.com`,
          },
          completedAt: isComplete
            ? new Date(now.getTime() - i * 3_600_000)
            : undefined,
          refundedAt:
            status === 'REFUNDED'
              ? new Date(now.getTime() - 86_400_000)
              : undefined,
        },
      });
    }),
  );

  console.log(`Created ${payments.length} payments`);

  // ── Payment Links ────────────────────────────────────────────

  await prisma.paymentLink.createMany({
    data: [
      // Active, fixed amount, single-use
      {
        merchantId: acme.id,
        amount: '25.00',
        currency: 'USD',
        description: 'T-shirt purchase',
        singleUse: true,
        active: true,
      },
      // Active, open amount, multi-use
      {
        merchantId: acme.id,
        amount: null,
        currency: 'USD',
        description: 'Donations',
        singleUse: false,
        usedCount: 12,
        active: true,
      },
      // Active with expiry
      {
        merchantId: globex.id,
        amount: '99.99',
        currency: 'EUR',
        description: 'Premium subscription',
        singleUse: false,
        expiresAt: new Date(now.getTime() + 7 * 86_400_000), // 7 days
        active: true,
      },
      // Expired link
      {
        merchantId: globex.id,
        amount: '50.00',
        currency: 'USD',
        description: 'Flash sale item',
        singleUse: true,
        expiresAt: expired,
        active: false,
      },
      // Used single-use link
      {
        merchantId: initech.id,
        amount: '150.00',
        currency: 'USD',
        description: 'Consulting session',
        singleUse: true,
        usedCount: 1,
        active: false,
      },
    ],
  });

  console.log('Created payment links');

  // ── Invoices ─────────────────────────────────────────────────

  await prisma.invoice.createMany({
    data: [
      // DRAFT
      {
        merchantId: acme.id,
        customerEmail: 'john@example.com',
        customerName: 'John Doe',
        lineItems: [
          { description: 'Web Development', qty: 40, unitPrice: '150.00' },
          { description: 'Design Services', qty: 10, unitPrice: '120.00' },
        ],
        subtotal: '7200.00',
        taxRate: '0.08',
        taxAmount: '576.00',
        total: '7776.00',
        currency: 'USD',
        status: 'DRAFT',
        dueDate: new Date(now.getTime() + 30 * 86_400_000),
      },
      // SENT
      {
        merchantId: acme.id,
        customerEmail: 'jane@startup.io',
        customerName: 'Jane Smith',
        lineItems: [
          { description: 'API Integration', qty: 1, unitPrice: '2500.00' },
        ],
        subtotal: '2500.00',
        total: '2500.00',
        currency: 'USD',
        status: 'SENT',
        dueDate: new Date(now.getTime() + 14 * 86_400_000),
      },
      // PAID
      {
        merchantId: globex.id,
        customerEmail: 'procurement@bigco.com',
        customerName: 'BigCo Procurement',
        lineItems: [
          {
            description: 'Enterprise License (Annual)',
            qty: 1,
            unitPrice: '12000.00',
          },
          { description: 'Priority Support', qty: 12, unitPrice: '500.00' },
        ],
        subtotal: '18000.00',
        taxRate: '0.10',
        taxAmount: '1800.00',
        total: '19800.00',
        currency: 'USD',
        status: 'PAID',
        paidAt: new Date(now.getTime() - 5 * 86_400_000),
        dueDate: new Date(now.getTime() - 10 * 86_400_000),
      },
      // OVERDUE
      {
        merchantId: globex.id,
        customerEmail: 'accounts@latepayer.com',
        customerName: 'Late Payer LLC',
        lineItems: [
          { description: 'Consulting Hours', qty: 20, unitPrice: '200.00' },
        ],
        subtotal: '4000.00',
        total: '4000.00',
        currency: 'USD',
        status: 'OVERDUE',
        dueDate: new Date(now.getTime() - 15 * 86_400_000),
      },
      // CANCELLED
      {
        merchantId: initech.id,
        customerEmail: 'billing@cancelled.co',
        customerName: 'Cancelled Co',
        lineItems: [
          { description: 'Software License', qty: 5, unitPrice: '99.00' },
        ],
        subtotal: '495.00',
        discount: '50.00',
        total: '445.00',
        currency: 'USD',
        status: 'CANCELLED',
      },
      // PARTIALLY_PAID
      {
        merchantId: acme.id,
        customerEmail: 'finance@partial.io',
        customerName: 'Partial Payments Inc',
        lineItems: [
          { description: 'Platform Setup', qty: 1, unitPrice: '5000.00' },
          { description: 'Monthly Hosting', qty: 6, unitPrice: '200.00' },
        ],
        subtotal: '6200.00',
        total: '6200.00',
        currency: 'USD',
        status: 'PARTIALLY_PAID',
        dueDate: new Date(now.getTime() + 7 * 86_400_000),
      },
    ],
  });

  console.log('Created invoices');

  // ── Payouts ──────────────────────────────────────────────────

  await prisma.payout.createMany({
    data: [
      // Completed bank payout
      {
        merchantId: acme.id,
        recipientName: 'Acme Corp Operating Account',
        destinationType: 'BANK_ACCOUNT',
        destination: {
          type: 'bank',
          account: '****4567',
          routing: '021000021',
          bank: 'Chase',
        },
        amount: '5000.00',
        currency: 'USD',
        status: 'COMPLETED',
        stellarTxHash: 'stellar_payout_tx_001',
        completedAt: new Date(now.getTime() - 2 * 86_400_000),
      },
      // Completed crypto payout
      {
        merchantId: acme.id,
        recipientName: 'Acme Treasury Wallet',
        destinationType: 'CRYPTO_WALLET',
        destination: {
          type: 'crypto',
          chain: 'ethereum',
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        },
        amount: '2500.00',
        currency: 'USDC',
        status: 'COMPLETED',
        stellarTxHash: 'stellar_payout_tx_002',
        completedAt: new Date(now.getTime() - 86_400_000),
      },
      // Processing mobile money payout
      {
        merchantId: globex.id,
        recipientName: 'Globex Kenya Office',
        destinationType: 'MOBILE_MONEY',
        destination: {
          type: 'mobile_money',
          provider: 'M-Pesa',
          phone: '+254700123456',
        },
        amount: '1200.00',
        currency: 'KES',
        status: 'PROCESSING',
        scheduledAt: now,
      },
      // Pending Stellar payout
      {
        merchantId: globex.id,
        recipientName: 'Globex Partner',
        destinationType: 'STELLAR',
        destination: {
          type: 'stellar',
          address: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBD3XCDGYOO5SS',
        },
        amount: '800.00',
        currency: 'USDC',
        status: 'PENDING',
        scheduledAt: new Date(now.getTime() + 86_400_000),
      },
      // Failed payout
      {
        merchantId: initech.id,
        recipientName: 'Initech Payroll',
        destinationType: 'BANK_ACCOUNT',
        destination: {
          type: 'bank',
          account: '****9012',
          routing: '021000089',
          bank: 'Wells Fargo',
        },
        amount: '15000.00',
        currency: 'USD',
        status: 'FAILED',
        failureReason: 'Insufficient settlement balance',
      },
      // Cancelled payout
      {
        merchantId: initech.id,
        recipientName: 'Vendor Payment',
        destinationType: 'CRYPTO_WALLET',
        destination: {
          type: 'crypto',
          chain: 'stellar',
          address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AHDKSTEBKHL5USQV7IRG3OVRRM',
        },
        amount: '300.00',
        currency: 'USDC',
        status: 'CANCELLED',
      },
    ],
  });

  console.log('Created payouts');

  // ── Webhook Events ───────────────────────────────────────────

  const completedPayments = payments.filter((p) => p.status === 'COMPLETED');
  const webhookData: Array<{
    merchantId: string;
    paymentId: string;
    eventType: string;
    payload: Record<string, string>;
    status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'EXHAUSTED';
    attempts: number;
    lastAttemptAt: Date;
  }> = completedPayments.flatMap((p) => [
    {
      merchantId: p.merchantId,
      paymentId: p.id,
      eventType: 'payment.created',
      payload: {
        paymentId: p.id,
        status: 'PENDING',
        amount: p.sourceAmount.toString(),
      },
      status: 'DELIVERED' as const,
      attempts: 1,
      lastAttemptAt: new Date(now.getTime() - 3_600_000),
    },
    {
      merchantId: p.merchantId,
      paymentId: p.id,
      eventType: 'payment.completed',
      payload: {
        paymentId: p.id,
        status: 'COMPLETED',
        amount: p.destAmount.toString(),
      },
      status: 'DELIVERED' as const,
      attempts: 1,
      lastAttemptAt: now,
    },
  ]);

  // Add a failed webhook
  if (payments.length > 12) {
    webhookData.push({
      merchantId: payments[12].merchantId,
      paymentId: payments[12].id,
      eventType: 'payment.failed',
      payload: {
        paymentId: payments[12].id,
        status: 'FAILED',
        reason: 'Bridge timeout',
      },
      status: 'EXHAUSTED',
      attempts: 5,
      lastAttemptAt: new Date(now.getTime() - 86_400_000),
    });
  }

  await prisma.webhookEvent.createMany({ data: webhookData });

  console.log(`Created ${webhookData.length} webhook events`);

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
