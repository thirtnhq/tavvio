import { z } from 'zod';
import { DestType } from '@prisma/client';

// Reuse payout DTO validation patterns
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

export const CreateRecipientSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.nativeEnum(DestType),
  details: DestinationSchema,
  isDefault: z.boolean().optional(),
});

export type CreateRecipientDto = z.infer<typeof CreateRecipientSchema>;

CreateRecipientDto.schema = CreateRecipientSchema;

