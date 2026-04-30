import { z } from 'zod';

export const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
