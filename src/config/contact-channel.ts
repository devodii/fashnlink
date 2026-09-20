import { z } from 'zod';

export const CONTACT_CHANNEL_TYPES = ['whatsapp', 'instagram', 'email'] as const;

export const contactChannelSchema = z.object({
  type: z.enum(CONTACT_CHANNEL_TYPES),
  value: z.string().min(1),
});

export type ContactChannelType = (typeof CONTACT_CHANNEL_TYPES)[number];
export type ContactChannel = z.infer<typeof contactChannelSchema>;
