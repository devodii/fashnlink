import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter, StoreRef } from '../types';
import type { NormalizedProduct } from '../schema';
import { mapVariantOptions } from '../shared/options';

/**
 * `?format=json` on a product or collection URL returns the same
 * server-rendered data the page's own JS uses, no auth needed. Confirmed
 * against real live stores: it only works on an actual product/collection
 * URL, not a generic page. Several real stores returned an empty `items: []`
 * or plain HTML for the wrong path.
 */

const squarespaceVariantSchema = z.object({
  id: z.string(),
  sku: z.string().nullable().optional(),
  price: z.number(),
  qtyInStock: z.number().optional().default(0),
  unlimited: z.boolean().optional().default(false),
  optionValues: z
    .array(z.object({ optionName: z.string(), value: z.string() }))
    .optional()
    .default([]),
  priceMoney: z.object({ currency: z.string() }).optional(),
});

const squarespaceAssetSchema = z.object({
  id: z.string(),
  assetUrl: z.string(),
  title: z.string().nullable().optional(),
});

export const squarespaceItemSchema = z.object({
  id: z.string(),
  urlId: z.string(),
  title: z.string(),
  excerpt: z.string().optional().default(''),
  fullUrl: z.string(),
  categories: z.array(z.string()).optional().default([]),
  variants: z.array(squarespaceVariantSchema).optional().default([]),
  items: z.array(squarespaceAssetSchema).optional().default([]),
});

export type SquarespaceRawProduct = z.infer<typeof squarespaceItemSchema> & { storeOrigin: string };

async function fetchJson<T>(url: string, ctx: Ctx): Promise<Result<T>> {
  try {
    const res = await ctx.fetch(url);
    if (!res.ok)
      return err({
        code: 'SCRAPE_FAILED',
        message: `Squarespace fetch failed: ${res.status} ${url}`,
      });
    return ok((await res.json()) as T);
  } catch (cause) {
    return err({ code: 'SCRAPE_FAILED', message: `Squarespace fetch threw: ${url}`, cause });
  }
}

// Squarespace serves the same asset at many widths via this query param.
function assetUrlAtMaxWidth(assetUrl: string): string {
  return `${assetUrl}?format=1000w`;
}

export const squarespaceAdapter: ScraperAdapter = {
  key: 'squarespace',
  displayName: 'Squarespace',
  priority: 30,
  capabilities: new Set(['detect', 'getProduct', 'listProducts', 'getVariants']),
  rawSchema: squarespaceItemSchema,

  async detect(page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
    const signals: string[] = [];
    if (page.html.includes('static1.squarespace.com')) signals.push('html:static1.squarespace.com');
    if (page.html.includes('sqs-')) signals.push('html:sqs-');

    const confidence = Math.min(1, signals.length / 2);
    return { match: confidence >= 0.5, confidence, signals };
  },

  async getProduct(url: URL, ctx: Ctx): Promise<Result<SquarespaceRawProduct>> {
    const jsonUrl = `${url.origin}${url.pathname}?format=json`;
    const result = await fetchJson<{ item?: unknown }>(jsonUrl, ctx);
    if (!result.ok) return result;

    if (!result.value.item) {
      return err({
        code: 'SCRAPE_FAILED',
        message: 'URL is not a Squarespace product page (no "item" in response)',
      });
    }

    const parsed = squarespaceItemSchema.safeParse(result.value.item);
    if (!parsed.success)
      return err({
        code: 'SCRAPE_FAILED',
        message: 'Squarespace product shape mismatch',
        cause: parsed.error,
      });

    return ok({ ...parsed.data, storeOrigin: url.origin });
  },

  async listProducts(store: StoreRef, cursor, ctx: Ctx) {
    const origin = `https://${store.domain}`;
    const collectionPath = typeof cursor === 'string' ? cursor : '/shop';
    const result = await fetchJson<{
      items?: unknown[];
      pagination?: { nextPageUrl?: string | null };
    }>(`${origin}${collectionPath}?format=json`, ctx);
    if (!result.ok) return result;

    const items = (result.value.items ?? [])
      .map((raw) => squarespaceItemSchema.safeParse(raw))
      .filter((r): r is { success: true; data: z.infer<typeof squarespaceItemSchema> } => r.success)
      .map((r) => ({ ...r.data, storeOrigin: origin }));

    return ok({ items, next: result.value.pagination?.nextPageUrl ?? null });
  },

  // No cart-permalink scheme; the product page itself is the buy
  // destination.
  buyDeepLink(product: NormalizedProduct): string | null {
    return product.url;
  },

  normalize(raw: SquarespaceRawProduct): Result<NormalizedProduct> {
    if (!raw.items.length)
      return err({ code: 'INVALID_INPUT', message: 'Squarespace product has no images' });

    const images = raw.items.map((asset, position) => ({
      url: assetUrlAtMaxWidth(asset.assetUrl),
      alt: asset.title ?? null,
      width: null,
      height: null,
      position,
      variantIds: [],
    }));

    const variants = raw.variants.map((variant) => {
      const optionPairs = variant.optionValues.map((o) => ({ name: o.optionName, value: o.value }));
      const { size, color, other } = mapVariantOptions(optionPairs);
      return {
        externalId: variant.id,
        sku: variant.sku ?? null,
        size,
        color,
        other,
        priceCents: variant.price,
        available: variant.unlimited || variant.qtyInStock > 0,
        imageUrl: null,
      };
    });

    const url = `${raw.storeOrigin}${raw.fullUrl}`;

    const optionValuesByName = new Map<string, Set<string>>();
    for (const variant of raw.variants) {
      for (const { optionName, value } of variant.optionValues) {
        if (!optionValuesByName.has(optionName)) optionValuesByName.set(optionName, new Set());
        optionValuesByName.get(optionName)?.add(value);
      }
    }
    const options = [...optionValuesByName.entries()].map(([name, values]) => ({
      name,
      values: [...values],
    }));

    return ok({
      externalId: raw.id,
      handle: raw.urlId,
      title: raw.title,
      url,
      buyUrl: url,
      brand: null,
      productType: raw.categories[0] ?? null,
      tags: raw.categories,
      descriptionText: raw.excerpt
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      priceCents: variants[0]?.priceCents ?? null,
      currency: raw.variants[0]?.priceMoney?.currency ?? null,
      available: variants.some((v) => v.available),
      images,
      variants,
      options,
      externalUpdatedAt: null,
      raw,
    });
  },
};
