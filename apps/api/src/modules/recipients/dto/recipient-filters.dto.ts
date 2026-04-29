import { z } from 'zod';
import { DestType } from '@prisma/client';

export const RecipientFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.nativeEnum(DestType).optional(),
  isDefault: z.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type RecipientFiltersDto = z.infer<typeof RecipientFiltersSchema>;

RecipientFiltersDto.schema = RecipientFiltersSchema;

