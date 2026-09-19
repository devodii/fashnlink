import { z } from 'zod';

// Section 6.4 — the one shape every platform adapter normalizes into. Nothing
// downstream (wearable gate, enrichment, repos) ever looks at platform-raw
// data again once this exists.
export const normalizedProductImageSchema = z.object({
  url: z.string(),
  alt: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  position: z.number(),
  variantIds: z.array(z.string()),
});

export const normalizedProductVariantSchema = z.object({
  externalId: z.string(),
  sku: z.string().nullable(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  other: z.string().nullable(),
  priceCents: z.number().nullable(),
  available: z.boolean(),
  imageUrl: z.string().nullable(),
});

export const normalizedProductOptionSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export const normalizedProductSchema = z.object({
  externalId: z.string(),
  handle: z.string(),
  title: z.string().min(1),
  url: z.string(),
  buyUrl: z.string().nullable(),
  brand: z.string().nullable(),
  productType: z.string().nullable(),
  tags: z.array(z.string()),
  descriptionText: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  available: z.boolean(),
  images: z.array(normalizedProductImageSchema).min(1),
  variants: z.array(normalizedProductVariantSchema),
  options: z.array(normalizedProductOptionSchema),
  externalUpdatedAt: z.string().nullable(),
  raw: z.unknown(),
});

export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;
export type NormalizedProductImage = z.infer<typeof normalizedProductImageSchema>;
export type NormalizedProductVariant = z.infer<typeof normalizedProductVariantSchema>;

// A platform's own response shape, validated by that adapter's own
// `rawSchema` before `normalize()` ever sees it (section 6.5). Kept as
// `unknown` here on purpose — each adapter narrows it internally.
export type RawProduct = unknown;

export type StoreInfo = {
  domain: string;
  platform: string;
  currency: string | null;
  country: string | null;
};

export type ScrapeResult = {
  store: StoreInfo;
  products: NormalizedProduct[];
  adapter: string;
  timings: Record<string, number>;
};
