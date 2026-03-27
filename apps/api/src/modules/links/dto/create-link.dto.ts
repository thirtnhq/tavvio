import { z } from 'zod';

export const CreateLinkSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().min(1).max(10).default('USD'),
  description: z.string().max(500).optional(),
  single_use: z.boolean().default(false),
  expires_at: z.string().datetime().optional(),
});

export type CreateLinkDto = z.infer<typeof CreateLinkSchema>;
