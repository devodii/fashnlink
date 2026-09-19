import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter, StoreRef } from '../types';
import type { NormalizedProduct } from '../schema';
import { mapVariantOptions } from '../shared/options';
import { centsFromMinorUnits, parsePriceStringToCents } from '../shared/price';

// Section 6.5's Shopify adapter — `.js` preferred (includes `options`,
// `media`, per-variant `featured_image`), `.json` fallback.

const shopifyMediaSchema = z.object({
  id: z.number(),
  media_type: z.string().optional(),
  src: z.string(),
  alt: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  position: z.number().optional(),
});

const shopifyVariantSchema = z.object({
  id: z.number(),
  sku: z.string().nullable().optional(),
  price: z.union([z.number(), z.string()]),
  available: z.boolean(),
  option1: z.string().nullable().optional(),
  option2: z.string().nullable().optional(),
  option3: z.string().nullable().optional(),
  featured_image: z.object({ src: z.string() }).nullable().optional(),
});

const shopifyOptionSchema = z.object({
  name: z.string(),
  position: z.number().optional(),
  values: z.array(z.string()),
});

export const shopifyRawSchema = z.object({
  id: z.number(),
  title: z.string(),
  handle: z.string(),
  description: z.string().optional().default(''),
  vendor: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  available: z.boolean().optional().default(true),
  published_at: z.string().nullable().optional(),
  url: z.string().optional(),
  options: z.array(shopifyOptionSchema).optional().default([]),
  variants: z.array(shopifyVariantSchema),
  media: z.array(shopifyMediaSchema).optional().default([]),
  images: z.array(z.string()).optional().default([]),
});

// `.js` gives variant prices in cents; `.json` (the fallback) gives dollar
// strings (section 6.5) — `priceFormat` records which one this raw payload
// came from so `normalize()` converts correctly either way.
export type ShopifyRawProduct = z.infer<typeof shopifyRawSchema> & {
  storeOrigin: string;
  priceFormat: 'cents' | 'dollars';
};

function extractHandle(url: URL): string | null {
  return url.pathname.match(/\/products\/([^/?#]+)/)?.[1] ?? null;
}

async function fetchJson<T>(url: string, ctx: Ctx): Promise<Result<T>> {
  try {
    const res = await ctx.fetch(url);
    if (!res.ok)
      return err({ code: 'SCRAPE_FAILED', message: `Shopify fetch failed: ${res.status} ${url}` });
    return ok((await res.json()) as T);
  } catch (cause) {
    return err({ code: 'SCRAPE_FAILED', message: `Shopify fetch threw: ${url}`, cause });
  }
}

export const shopifyAdapter: ScraperAdapter = {
  key: 'shopify',
  displayName: 'Shopify',
  priority: 10,
  capabilities: new Set([
    'detect',
    'getProduct',
    'listProducts',
    'getVariants',
    'buyDeepLink',
    'freshness',
    'collections',
  ]),
  rawSchema: shopifyRawSchema,

  async detect(page: HomepageProbe, ctx: Ctx): Promise<DetectResult> {
    const signals: string[] = [];
    if (page.headers.get('x-shopify-stage') || page.headers.get('x-shopid'))
      signals.push('header:x-shopify-stage|x-shopid');
    if (page.html.includes('cdn.shopify.com')) signals.push('html:cdn.shopify.com');
    if (/window\.Shopify|Shopify\.theme/.test(page.html)) signals.push('html:window.Shopify');

    const probe = await fetchJson<{ products: unknown[] }>(
      `${page.url.origin}/products.json?limit=1`,
      ctx,
    );
    if (probe.ok && Array.isArray(probe.value.products)) signals.push('api:/products.json');

    const confidence = Math.min(1, signals.length / 2);
    return { match: confidence >= 0.5, confidence, signals };
  },

  async getProduct(url: URL, ctx: Ctx): Promise<Result<ShopifyRawProduct>> {
    const handle = extractHandle(url);
    if (!handle)
      return err({
        code: 'INVALID_INPUT',
        message: 'Not a Shopify product URL (no /products/{handle})',
      });

    let raw: unknown = null;
    let priceFormat: 'cents' | 'dollars' = 'cents';
    const jsResult = await fetchJson<unknown>(`${url.origin}/products/${handle}.js`, ctx);
    if (jsResult.ok) {
      raw = jsResult.value;
      priceFormat = 'cents';
    } else {
      const jsonResult = await fetchJson<{ product: unknown }>(
        `${url.origin}/products/${handle}.json`,
        ctx,
      );
      if (jsonResult.ok) {
        raw = jsonResult.value.product;
        priceFormat = 'dollars';
      }
    }

    if (!raw)
      return err({ code: 'SCRAPE_FAILED', message: `Shopify product not found: ${handle}` });

    const parsed = shopifyRawSchema.safeParse(raw);
    if (!parsed.success)
      return err({
        code: 'SCRAPE_FAILED',
        message: 'Shopify product shape mismatch',
        cause: parsed.error,
      });

    return ok({ ...parsed.data, storeOrigin: url.origin, priceFormat });
  },

  async listProducts(store: StoreRef, cursor, ctx: Ctx) {
    const page = typeof cursor === 'number' ? cursor : 1;
    const origin = `https://${store.domain}`;
    const result = await fetchJson<{ products: unknown[] }>(
      `${origin}/products.json?limit=250&page=${page}`,
      ctx,
    );
    if (!result.ok) return result;

    const items = result.value.products
      .map((raw) => shopifyRawSchema.safeParse(raw))
      .filter((r): r is { success: true; data: z.infer<typeof shopifyRawSchema> } => r.success)
      .map((r) => ({ ...r.data, storeOrigin: origin, priceFormat: 'dollars' as const }));

    return ok({ items, next: items.length === 250 ? page + 1 : null });
  },

  buyDeepLink(_product: NormalizedProduct, variantId?: string): string | null {
    // Reconstructed from `raw` at call time by the pipeline, since
    // `NormalizedProduct` alone doesn't carry the store origin — see
    // `normalize()`, which already sets `buyUrl` using the default variant so
    // this is mostly here to support re-deriving it for a *different* variant
    // (section 8.3's variant re-render). `product.url`'s origin is reused.
    const origin = new URL(_product.url).origin;
    const targetVariant = variantId ?? _product.variants[0]?.externalId;
    if (!targetVariant) return null;
    return `${origin}/cart/${targetVariant}:1`;
  },

  freshnessKey(raw: ShopifyRawProduct): string | null {
    return raw.published_at ?? null;
  },

  normalize(raw: ShopifyRawProduct): Result<NormalizedProduct> {
    const toCents = (price: string | number | null | undefined) =>
      raw.priceFormat === 'cents'
        ? centsFromMinorUnits(price)
        : parsePriceStringToCents(price ?? null);

    const images = raw.media.length
      ? raw.media.filter((m) => !m.media_type || m.media_type === 'image')
      : raw.images.map((src, i) => ({
          id: i,
          src,
          alt: null,
          width: null,
          height: null,
          position: i,
        }));

    if (!images.length)
      return err({ code: 'INVALID_INPUT', message: 'Shopify product has no images' });

    const normalizedImages = images.map((media, position) => {
      const variantIds = raw.variants
        .filter((v) => v.featured_image?.src === media.src)
        .map((v) => String(v.id));
      return {
        url: media.src.startsWith('//') ? `https:${media.src}` : media.src,
        alt: media.alt ?? null,
        width: media.width ?? null,
        height: media.height ?? null,
        position,
        variantIds,
      };
    });

    const optionNames = raw.options.map((o) => o.name);
    const variants = raw.variants.map((variant) => {
      const optionPairs = [variant.option1, variant.option2, variant.option3]
        .map((value, i) => ({ name: optionNames[i] ?? `Option ${i + 1}`, value }))
        .filter((pair): pair is { name: string; value: string } => !!pair.value);
      const { size, color, other } = mapVariantOptions(optionPairs);
      return {
        externalId: String(variant.id),
        sku: variant.sku ?? null,
        size,
        color,
        other,
        priceCents: toCents(variant.price),
        available: variant.available,
        imageUrl: variant.featured_image?.src ?? null,
      };
    });

    const defaultVariant = raw.variants.find((v) => v.available) ?? raw.variants[0];
    const buyUrl = defaultVariant ? `${raw.storeOrigin}/cart/${defaultVariant.id}:1` : null;

    return ok({
      externalId: String(raw.id),
      handle: raw.handle,
      title: raw.title,
      url: `${raw.storeOrigin}/products/${raw.handle}`,
      buyUrl,
      brand: raw.vendor ?? null,
      productType: raw.type ?? null,
      tags: raw.tags,
      descriptionText: raw.description
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      priceCents: toCents(defaultVariant?.price ?? null),
      currency: null,
      available: raw.available,
      images: normalizedImages,
      variants,
      options: raw.options.map((o) => ({ name: o.name, values: o.values })),
      externalUpdatedAt: raw.published_at ?? null,
      raw,
    });
  },
};
