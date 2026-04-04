import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

export const InvoiceFiltersSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  currency: z.string().toUpperCase().optional(),
  customerEmail: z.string().email().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'dueDate', 'total', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type InvoiceFiltersDto = z.infer<typeof InvoiceFiltersSchema>;
