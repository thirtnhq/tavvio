import { z } from 'zod';

export const CustomerAddressSchema = z.object({
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(1).max(100),
  zip: z.string().max(20).optional(),
});

export const LineItemSchema = z.object({
  description: z.string().min(1).max(500),
  qty: z.number().positive().finite(),
  unitPrice: z.number().nonnegative().finite(),
});

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR',
  'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN',
  'AED', 'SAR', 'SGD', 'HKD', 'CHF', 'SEK', 'NOK',
] as const;

export const CreateInvoiceSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(255).optional(),
  customerPhone: z.string().max(30).optional(),
  customerAddress: CustomerAddressSchema.optional(),

  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),

  taxRate: z
    .number()
    .min(0)
    .max(1, 'Tax rate must be between 0 and 1 (e.g. 0.1 for 10%)')
    .optional(),
  discount: z.number().nonnegative().optional(),

  currency: z
    .string()
    .toUpperCase()
    .refine((v) => SUPPORTED_CURRENCIES.includes(v as (typeof SUPPORTED_CURRENCIES)[number]), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    })
    .default('USD'),

  dueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  invoiceNumber: z.string().max(50).optional(),
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
