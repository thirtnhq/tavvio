import { z } from 'zod';

// ── Destination sub-schemas ────────────────────────────────────────────────────

const BankAccountDestSchema = z.object({
  type: z.literal('BANK_ACCOUNT'),
  accountNumber: z.string().min(1).max(64),
  routingNumber: z.string().max(20).optional(),
  bankName: z.string().max(255).optional(),
  iban: z.string().max(34).optional(),
  bic: z.string().max(11).optional(),
  branchCode: z.string().max(20).optional(),
  country: z.string().length(2).toUpperCase(),
});

const MobileMoneyDestSchema = z.object({
  type: z.literal('MOBILE_MONEY'),
  phoneNumber: z.string().min(7).max(20),
  provider: z.string().min(1).max(100),
  country: z.string().length(2).toUpperCase(),
});

const CryptoWalletDestSchema = z.object({
  type: z.literal('CRYPTO_WALLET'),
  address: z.string().min(1).max(255),
  network: z.string().min(1).max(50),
  asset: z.string().min(1).max(50),
});

const StellarDestSchema = z.object({
  type: z.literal('STELLAR'),
  address: z.string().min(1).max(255),
  asset: z.string().min(1).max(50).default('native'),
  memo: z.string().max(28).optional(),
});

const DestinationSchema = z.discriminatedUnion('type', [
  BankAccountDestSchema,
  MobileMoneyDestSchema,
  CryptoWalletDestSchema,
  StellarDestSchema,
]);

// ── Create single payout ───────────────────────────────────────────────────────

export const CreatePayoutSchema = z.object({
  recipientId: z.string().optional(),
  recipientName: z.string().min(1).max(255),
  destinationType: z.enum([
    'BANK_ACCOUNT',
    'MOBILE_MONEY',
    'CRYPTO_WALLET',
    'STELLAR',
  ]),
  destination: DestinationSchema,
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,18})?$/, 'amount must be a positive decimal string')
    .refine((v) => parseFloat(v) > 0, {
      message: 'amount must be greater than 0',
    }),
  currency: z.string().length(3).toUpperCase(),
  scheduledAt: z.coerce.date().optional(),
});

export type CreatePayoutDto = z.infer<typeof CreatePayoutSchema>;

// ── Bulk payout ────────────────────────────────────────────────────────────────

export const BulkPayoutSchema = z.object({
  payouts: z
    .array(CreatePayoutSchema)
    .min(1, 'At least one payout is required')
    .max(10_000, 'Maximum 10,000 recipients per bulk payout'),
});

export type BulkPayoutDto = z.infer<typeof BulkPayoutSchema>;
