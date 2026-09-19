import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter, StoreRef } from '../types';
import type { NormalizedProduct } from '../schema';
import { mapVariantOptions } from '../shared/options';

/**
 * Store API prices are integer strings scaled by `10^currency_minor_unit`
 * (e.g. "2000" at minor_unit 2 == $20.00); rescale to our own always-cents
 * (`priceCents`, i.e. *100) convention regardless of the store's minor unit.
 */
function wooPriceToCents(priceStr: string, minorUnit: number): number | null {
  const raw = parseInt(priceStr, 10);
  if (!Number.isFinite(raw)) return null;
  return Math.round((raw / 10 ** minorUnit) * 100);
}

/**
 * WooCommerce adapter; the Store API (`wc/store/v1`), not the
 * authenticated REST API (no API key needed, it's the same data the theme's
 * own JS uses to render the page).
 */

const wooImageSchema = z.object({
  id: z.number(),
  src: z.string(),
  alt: z.string().nullable().optional(),
  name: z.string().optional(),
});

const wooAttributeSchema = z.object({
  id: z.number(),
  name: z.string(),
  has_variations: z.boolean(),
  terms: z.array(z.object({ id: z.number(), name: z.string(), slug: z.string() })),
});

const wooVariationRefSchema = z.object({
  id: z.number(),
  attributes: z.array(z.object({ name: z.string(), value: z.string() })),
});

export const woocommerceRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  permalink: z.string(),
  sku: z.string().nullable().optional(),
  short_description: z.string().optional().default(''),
  description: z.string().optional().default(''),
  prices: z.object({
    price: z.string(),
    currency_code: z.string(),
    currency_minor_unit: z.number(),
  }),
  images: z.array(wooImageSchema).optional().default([]),
  categories: z
    .array(z.object({ id: z.number(), name: z.string(), slug: z.string() }))
    .optional()
    .default([]),
  attributes: z.array(wooAttributeSchema).optional().default([]),
  variations: z.array(wooVariationRefSchema).optional().default([]),
  is_purchasable: z.boolean().optional().default(true),
  is_in_stock: z.boolean().optional().default(true),
});

/**
 * A resolved variation is the same shape as a product (the Store API returns
 * `type: "variation"` products for variation ids), narrowed to the fields
 * `normalize()` actually needs.
 */
const wooResolvedVariationSchema = z.object({
  id: z.number(),
  sku: z.string().nullable().optional(),
  prices: z.object({ price: z.string(), currency_minor_unit: z.number() }),
  is_in_stock: z.boolean().optional().default(true),
  images: z.array(wooImageSchema).optional().default([]),
  attributes: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .optional()
    .default([]),
});

export type WooCommerceRawProduct = z.infer<typeof woocommerceRawSchema> & {
  storeOrigin: string;
  resolvedVariations: z.infer<typeof wooResolvedVariationSchema>[];
};

async function fetchJson<T>(url: string, ctx: Ctx): Promise<Result<T>> {
  try {
    const res = await ctx.fetch(url);
    if (!res.ok)
      return err({
        code: 'SCRAPE_FAILED',
        message: `WooCommerce fetch failed: ${res.status} ${url}`,
      });
    return ok((await res.json()) as T);
  } catch (cause) {
    return err({ code: 'SCRAPE_FAILED', message: `WooCommerce fetch threw: ${url}`, cause });
  }
}

/**
 * `GET /wp-json/...` first; on a 404 (some hosts block pretty permalinks for
 * the REST base), retry the `?rest_route=` form; same response shape either
 * way, just a different URL construction.
 */
async function fetchStoreApi<T>(origin: string, path: string, ctx: Ctx): Promise<Result<T>> {
  const pretty = await fetchJson<T>(`${origin}/wp-json${path}`, ctx);
  if (pretty.ok) return pretty;
  return fetchJson<T>(`${origin}/?rest_route=${path}`, ctx);
}

/**
 * extract the WordPress post id from the product page HTML ;
 * the `<body class="... postid-{id} ...">` WordPress always renders for the
 * single post/product currently being viewed is the most reliable signal
 * (unlike a bare `data-product_id="{id}"`, which also appears on related-
 * product widgets elsewhere on the page and isn't reliably the FIRST match).
 * `data-product_id` and JSON-LD `@id` are the documented fallbacks.
 */
function extractProductId(html: string): string | null {
  const bodyTag = html.match(/<body[^>]*>/i)?.[0];
  const postId = bodyTag?.match(/\bpostid-(\d+)\b/)?.[1];
  if (postId) return postId;

  const dataProductId = html.match(/data-product_id="(\d+)"/)?.[1];
  if (dataProductId) return dataProductId;

  return null;
}

async function resolveVariations(
  origin: string,
  variationRefs: z.infer<typeof wooVariationRefSchema>[],
  ctx: Ctx,
): Promise<z.infer<typeof wooResolvedVariationSchema>[]> {
  const resolved: z.infer<typeof wooResolvedVariationSchema>[] = [];
  for (const ref of variationRefs) {
    const result = await fetchStoreApi<unknown>(origin, `/wc/store/v1/products/${ref.id}`, ctx);
    if (!result.ok) continue;
    const parsed = wooResolvedVariationSchema.safeParse(result.value);
    if (parsed.success) resolved.push({ ...parsed.data, attributes: ref.attributes });
  }
  return resolved;
}

export const woocommerceAdapter: ScraperAdapter = {
  key: 'woocommerce',
  displayName: 'WooCommerce',
  priority: 20,
  /**
   * DECISION: no `freshness` capability; the Store API exposes no
   * `date_modified`, and there's no other reliable per-product
   * timestamp to key a `freshnessKey()` off. The pipeline's own universal
   * `content_hash` (computed from the normalized product, every platform)
   * already covers cheap change detection without one.
   */
  capabilities: new Set([
    'detect',
    'getProduct',
    'listProducts',
    'getVariants',
    'buyDeepLink',
    'collections',
  ]),
  rawSchema: woocommerceRawSchema,

  async detect(page: HomepageProbe, ctx: Ctx): Promise<DetectResult> {
    /**
     * DECISION: found via real-world testing, not spec text; a lone
     * `/wp-content/` match is NOT sufficient on its own (unlike a real bug
     * this caught: carillons.be is a real PrestaShop store with a companion
     * WordPress *blog* at /blog, whose embedded post-thumbnail URLs contain
     * `/wp-content/` and nothing else WooCommerce-specific, which falsely
     * matched WooCommerce before this fix). Section 6.3's own table entry
     * requires two independent HTML signals before trusting a match; this
     * adapter's detect() hadn't actually enforced that the same way
     * `src/modules/scraper/detect.ts`'s fingerprinting detector does; now it
     * does. A successful live Store API probe is treated as authoritative on
     * its own since it can't false-positive the way a substring match can.
     */
    const htmlSignals: string[] = [];
    if (page.html.includes('/wp-content/')) htmlSignals.push('html:/wp-content/');
    if (/woocommerce|wc-blocks|wc_add_to_cart_params/.test(page.html))
      htmlSignals.push('html:woocommerce');

    const probe = await fetchStoreApi<unknown[]>(
      page.url.origin,
      '/wc/store/v1/products?per_page=1',
      ctx,
    );
    if (probe.ok && Array.isArray(probe.value)) {
      return { match: true, confidence: 1, signals: [...htmlSignals, 'api:/wc/store/v1/products'] };
    }

    if (htmlSignals.length < 2)
      return { match: false, confidence: htmlSignals.length / 2, signals: htmlSignals };
    return { match: true, confidence: 1, signals: htmlSignals };
  },

  async getProduct(url: URL, ctx: Ctx): Promise<Result<WooCommerceRawProduct>> {
    let pageHtml: string | null = null;
    try {
      const pageRes = await ctx.fetch(url.toString());
      if (pageRes.ok) pageHtml = await pageRes.text();
    } catch {
      // fall through; extractProductId(null) below returns null, handled
    }

    const productId = pageHtml ? extractProductId(pageHtml) : null;
    if (!productId) {
      return err({
        code: 'SCRAPE_FAILED',
        message: 'Could not find a WooCommerce product id on the page',
      });
    }

    const productResult = await fetchStoreApi<unknown>(
      url.origin,
      `/wc/store/v1/products/${productId}`,
      ctx,
    );
    if (!productResult.ok) return productResult;

    const parsed = woocommerceRawSchema.safeParse(productResult.value);
    if (!parsed.success)
      return err({
        code: 'SCRAPE_FAILED',
        message: 'WooCommerce product shape mismatch',
        cause: parsed.error,
      });

    const resolvedVariations = parsed.data.variations.length
      ? await resolveVariations(url.origin, parsed.data.variations, ctx)
      : [];

    return ok({ ...parsed.data, storeOrigin: url.origin, resolvedVariations });
  },

  async listProducts(store: StoreRef, cursor, ctx: Ctx) {
    const page = typeof cursor === 'number' ? cursor : 1;
    const origin = `https://${store.domain}`;
    let raw: unknown;
    let totalPages = page;
    try {
      const res = await ctx.fetch(
        `${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`,
      );
      if (!res.ok)
        return err({ code: 'SCRAPE_FAILED', message: `WooCommerce list failed: ${res.status}` });
      raw = await res.json();
      totalPages = Number(res.headers.get('x-wp-totalpages') ?? page);
    } catch (cause) {
      return err({ code: 'SCRAPE_FAILED', message: 'WooCommerce list threw', cause });
    }

    const items = (Array.isArray(raw) ? raw : [])
      .map((p) => woocommerceRawSchema.safeParse(p))
      .filter((r): r is { success: true; data: z.infer<typeof woocommerceRawSchema> } => r.success)
      /**
       * Catalog crawl does NOT resolve variations per product (section 6.5:
       * "not for the whole catalog up front"); only `getProduct` (a single
       * pasted/linked URL) does.
       */
      .map((r) => ({
        ...r.data,
        storeOrigin: origin,
        resolvedVariations: [] as z.infer<typeof wooResolvedVariationSchema>[],
      }));

    return ok({ items, next: page < totalPages ? page + 1 : null });
  },

  buyDeepLink(product: NormalizedProduct, variantId?: string): string | null {
    const origin = new URL(product.url).origin;
    const productExternalId = product.externalId;
    const variationParam = variantId ? `&variation_id=${variantId}` : '';
    return `${origin}/?add-to-cart=${productExternalId}${variationParam}&quantity=1`;
  },

  normalize(raw: WooCommerceRawProduct): Result<NormalizedProduct> {
    if (!raw.images.length)
      return err({ code: 'INVALID_INPUT', message: 'WooCommerce product has no images' });

    const images = raw.images.map((image, position) => ({
      url: image.src,
      alt: image.alt ?? null,
      width: null,
      height: null,
      position,
      variantIds: raw.resolvedVariations
        .filter((v) => v.images.some((vi) => vi.src === image.src))
        .map((v) => String(v.id)),
    }));

    const variants = raw.resolvedVariations.map((variation) => {
      const optionPairs = variation.attributes.map((a) => ({ name: a.name, value: a.value }));
      const { size, color, other } = mapVariantOptions(optionPairs);
      return {
        externalId: String(variation.id),
        sku: variation.sku ?? null,
        size,
        color,
        other,
        priceCents: wooPriceToCents(variation.prices.price, variation.prices.currency_minor_unit),
        available: variation.is_in_stock,
        imageUrl: variation.images[0]?.src ?? null,
      };
    });

    const options = raw.attributes
      .filter((a) => a.has_variations)
      .map((a) => ({ name: a.name, values: a.terms.map((t) => t.name) }));

    const buyUrl = `${raw.storeOrigin}/?add-to-cart=${raw.id}&quantity=1`;

    return ok({
      externalId: String(raw.id),
      handle: raw.slug,
      title: raw.name,
      url: raw.permalink,
      buyUrl,
      brand: null,
      productType: raw.categories[0]?.name ?? null,
      tags: raw.categories.map((c) => c.name),
      descriptionText: raw.description
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      priceCents:
        variants[0]?.priceCents ??
        wooPriceToCents(raw.prices.price, raw.prices.currency_minor_unit),
      currency: raw.prices.currency_code,
      available: raw.is_in_stock,
      images,
      variants,
      options,
      externalUpdatedAt: null,
      raw,
    });
  },
};
