import { z } from 'zod';

export const contactChannelSchema = z.object({
  type: z.enum(['whatsapp', 'instagram', 'email']),
  value: z.string().min(1),
});
export type ContactChannel = z.infer<typeof contactChannelSchema>;

export const shopperTwinSchema = z.object({
  id: z.string(),
  status: z.string(),
  twinUrl: z.string().nullable(),
});
export type ShopperTwin = z.infer<typeof shopperTwinSchema>;

export const variantOptionValueSchema = z.object({
  id: z.string(),
  label: z.string(),
  available: z.boolean(),
});

export const variantOptionSchema = z.object({
  name: z.string(),
  values: z.array(variantOptionValueSchema),
});
export type VariantOption = z.infer<typeof variantOptionSchema>;

export const linkDetailResponseSchema = z.object({
  kind: z.literal('single'),
  linkId: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  buyUrl: z.string().nullable(),
  merchantName: z.string(),
  contactChannel: contactChannelSchema.nullable(),
  accentToken: z.string().nullable(),
  productImageUrl: z.string().nullable(),
  variantOptions: z.array(variantOptionSchema),
  defaultTwin: shopperTwinSchema.nullable(),
});
export type LinkDetailResponse = z.infer<typeof linkDetailResponseSchema>;

export const twinStatusResponseSchema = z.object({
  status: z.string(),
  twinUrl: z.string().nullable(),
  isDefault: z.boolean(),
});
export type TwinStatusResponse = z.infer<typeof twinStatusResponseSchema>;

export const renderErrorSchema = z
  .object({ message: z.string().optional() })
  .catchall(z.unknown())
  .nullable();

export const renderStatusResponseSchema = z.object({
  status: z.string(),
  outputUrl: z.string().nullable(),
  watermarked: z.boolean(),
  error: renderErrorSchema.optional(),
});
export type RenderStatusResponse = z.infer<typeof renderStatusResponseSchema>;

export const createRenderResponseSchema = z.object({
  renderId: z.string(),
  status: z.literal('queued'),
});

export const createTwinResponseSchema = z.object({
  twinId: z.string(),
  status: z.literal('pending'),
});

export const closetItemSchema = z.object({
  renderId: z.string(),
  outputUrl: z.string().nullable(),
  isPublic: z.boolean(),
  buyUrl: z.string().nullable(),
  productTitle: z.string(),
  merchantName: z.string(),
  createdAt: z.string(),
});
export type ClosetItem = z.infer<typeof closetItemSchema>;

export const closetResponseSchema = z.object({
  items: z.array(closetItemSchema),
  defaultTwin: shopperTwinSchema.nullable(),
});
export type ClosetResponse = z.infer<typeof closetResponseSchema>;

export const sharedRenderResponseSchema = z.object({
  outputUrl: z.string(),
  productTitle: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  merchantName: z.string(),
  slug: z.string(),
});
export type SharedRenderResponse = z.infer<typeof sharedRenderResponseSchema>;
