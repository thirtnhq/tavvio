import { z } from 'zod';
import { CreateRecipientDto } from './create-recipient.dto';

export const UpdateRecipientSchema = CreateRecipientDto.schema.partial();

export type UpdateRecipientDto = z.infer<typeof UpdateRecipientSchema>;

