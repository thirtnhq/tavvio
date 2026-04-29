"use client";

import { z } from "zod";
import type { DestType } from "@useroutr/types";

// ── Destination sub-schemas ──────────────────────────────────────────────────

const BankAccountDestSchema = z.object({
  type: z.literal("BANK_ACCOUNT"),
  accountNumber: z.string().min(1, "Account number is required").max(64),
  routingNumber: z.string().max(20).optional(),
  bankName: z.string().min(1, "Bank name is required").max(255),
  country: z.string().length(2, "Country code must be 2 characters").toUpperCase(),
});

const MobileMoneyDestSchema = z.object({
  type: z.literal("MOBILE_MONEY"),
  phoneNumber: z.string().min(7, "Phone number must be at least 7 characters").max(20),
  provider: z.string().min(1, "Provider is required"),
  country: z.string().length(2, "Country code must be 2 characters").toUpperCase(),
});

const CryptoWalletDestSchema = z.object({
  type: z.literal("CRYPTO_WALLET"),
  address: z.string().min(1, "Wallet address is required").max(255),
  network: z.string().min(1, "Network is required"),
  asset: z.string().min(1, "Asset is required"),
});

const StellarDestSchema = z.object({
  type: z.literal("STELLAR"),
  address: z.string().min(1, "Stellar address is required").max(255).regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address format (must start with G and be 56 characters)"),
  asset: z.string().min(1, "Asset is required").default("native"),
  memo: z.string().max(28).optional(),
});

const DestinationSchema = z.discriminatedUnion("type", [
  BankAccountDestSchema,
  MobileMoneyDestSchema,
  CryptoWalletDestSchema,
  StellarDestSchema,
]);

// ── Main payout form schema ───────────────────────────────────────────────────

export const PayoutFormSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required").max(255),
  destinationType: z.enum(["BANK_ACCOUNT", "MOBILE_MONEY", "CRYPTO_WALLET", "STELLAR"] as const),
  destination: DestinationSchema,
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,18})?$/, "Amount must be a positive number"),
  currency: z.string().length(3, "Currency code must be 3 characters").toUpperCase(),
  saveRecipient: z.boolean().default(false),
});

// ── Confirmation data schema ─────────────────────────────────────────────────

export const PayoutConfirmationSchema = z.object({
  recipientName: z.string(),
  destinationType: z.enum(["BANK_ACCOUNT", "MOBILE_MONEY", "CRYPTO_WALLET", "STELLAR"] as const),
  destination: z.object({
    type: z.string(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    bankName: z.string().optional(),
    country: z.string().optional(),
    phoneNumber: z.string().optional(),
    provider: z.string().optional(),
    address: z.string().optional(),
    network: z.string().optional(),
    asset: z.string().optional(),
    memo: z.string().optional(),
  }),
  amount: z.string(),
  currency: z.string(),
  fee: z.string().optional(),
  total: z.string().optional(),
});

// ── Types ────────────────────────────────────────────────────────────────────

export type PayoutFormData = z.infer<typeof PayoutFormSchema>;
export type PayoutConfirmationData = z.infer<typeof PayoutConfirmationSchema>;
export type DestinationFormData = z.infer<typeof DestinationSchema>;

// ── Helper types for destination fields ──────────────────────────────────────

export interface BankAccountFields {
  type: "BANK_ACCOUNT";
  accountNumber: string;
  routingNumber?: string;
  bankName: string;
  country: string;
}

export interface MobileMoneyFields {
  type: "MOBILE_MONEY";
  phoneNumber: string;
  provider: string;
  country: string;
}

export interface CryptoWalletFields {
  type: "CRYPTO_WALLET";
  address: string;
  network: string;
  asset: string;
}

export interface StellarFields {
  type: "STELLAR";
  address: string;
  asset: string;
  memo?: string;
}

// ── Default values ─────────────────────────────────────────────────────────

export const defaultDestinationByType: Record<DestType, DestinationFormData> = {
  BANK_ACCOUNT: {
    type: "BANK_ACCOUNT",
    accountNumber: "",
    routingNumber: "",
    bankName: "",
    country: "US",
  },
  MOBILE_MONEY: {
    type: "MOBILE_MONEY",
    phoneNumber: "",
    provider: "",
    country: "NG",
  },
  CRYPTO_WALLET: {
    type: "CRYPTO_WALLET",
    address: "",
    network: "ethereum",
    asset: "USDC",
  },
  STELLAR: {
    type: "STELLAR",
    address: "",
    asset: "native",
  },
};

export const defaultFormValues: Omit<PayoutFormData, "destination"> & { destination: { type: DestType } } = {
  recipientName: "",
  destinationType: "STELLAR",
  destination: { type: "STELLAR" },
  amount: "",
  currency: "USD",
  saveRecipient: false,
};

// ── Validation helpers ───────────────────────────────────────────────────────

export function validateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

export function validateStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address);
}

export function validatePhoneNumber(phone: string): boolean {
  // Basic international phone validation
  return /^[+]?[\d\s-]{7,20}$/.test(phone.replace(/\s/g, ""));
}

export function validateCryptoAddress(address: string): boolean {
  // Basic validation - at least 10 chars, alphanumeric
  return address.length >= 10 && /^[a-zA-Z0-9]+$/.test(address);
}
