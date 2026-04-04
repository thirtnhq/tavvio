import { z } from 'zod';
import { CustomerAddressSchema, LineItemSchema } from './create-invoice.dto';

export const UpdateInvoiceSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().min(1).max(255).optional(),
  customerPhone: z.string().max(30).optional(),
  customerAddress: CustomerAddressSchema.optional(),

  lineItems: z.array(LineItemSchema).min(1).optional(),

  taxRate: z.number().min(0).max(1).optional(),
  discount: z.number().nonnegative().optional(),

  dueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  invoiceNumber: z.string().max(50).optional(),
});

export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;

// ── Partial payment ────────────────────────────────────────────────────────────

export const RecordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentId: z.string().optional(),
});

export type RecordPaymentDto = z.infer<typeof RecordPaymentSchema>;
