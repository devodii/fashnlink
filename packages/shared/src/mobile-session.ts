import { z } from 'zod';

export const mobileSessionResponseSchema = z.object({
  shopperId: z.string(),
  token: z.string(),
});

export type MobileSessionResponse = z.infer<typeof mobileSessionResponseSchema>;
