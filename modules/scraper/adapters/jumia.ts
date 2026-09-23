import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter } from '../types';
import type { NormalizedProduct } from '../schema';
import { extractJsonLdBlocks } from '../shared/jsonld';
import { extractMetaTags, extractTitleTag } from '../shared/opengraph';
import { parsePriceStringToCents, toAbsoluteUrl } from '@/lib/util';

// Confirmed against 4 real Jumia Nigeria product-page captures of the same
// 2 listings (see jumia.test.ts): a Jan 2026 Wayback Machine capture of each
// nests the JSON-LD Product at `ItemPage.mainEntity`; a fresh live fetch of
// the same 2 URLs in Sep 2026 instead puts Product as a flat member of a
// top-level `@graph` array, with a separate `ItemPage` node that merely
// references it by `@id` — i.e. Jumia's product-page template changed
// in between, and both shapes are handled here defensively since both are
// genuinely real. Neither shape's images fit shared/jsonld.ts's
// jsonLdImages(): both use `ImageObject.contentUrl` (an array), not the
// `.url` shape it reads. There's also no og:price/product:price meta tag in
// either capture, so shared/product-page.ts's OG fallback can't recover
// price either. These gaps are why this is a bespoke adapter instead of
// createCheckoutPageAdapter.

const jumiaOfferSchema = z.object({
  price: z.union([z.string(), z.number()]).optional(),
  priceCurrency: z.string().optional(),
  availability: z.string().optional(),
});

const jumiaJsonLdProductSchema = z.object({
  '@type': z.union([z.literal('Product'), z.array(z.string())]).optional(),
  name: z.string(),
  description: z.string().optional(),
  offers: jumiaOfferSchema.optional(),
  image: z.object({ contentUrl: z.array(z.string()).optional() }).optional(),
});

type JumiaJsonLdProduct = z.infer<typeof jumiaJsonLdProductSchema>;

function isProductNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const type = (node as Record<string, unknown>)['@type'];
  return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
}

function findJumiaProduct(blocks: unknown[]): JumiaJsonLdProduct | null {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const root = block as Record<string, unknown>;

    if (Array.isArray(root['@graph'])) {
      const productNode = (root['@graph'] as unknown[]).find(isProductNode);
      const parsed = jumiaJsonLdProductSchema.safeParse(productNode);
      if (parsed.success) return parsed.data;
    }

    const parsed = jumiaJsonLdProductSchema.safeParse(root.mainEntity);
    if (parsed.success) return parsed.data;
  }
  return null;
}

// Real Jumia product URLs end in `-<numeric id>.html` (verified against
// hundreds of live URLs via the Wayback CDX index, not just the 2 fixtures).
function extractProductId(url: URL): string {
  return url.pathname.match(/-(\d+)\.html$/)?.[1] ?? url.toString();
}

// Size/color options aren't in the JSON-LD or anywhere server-rendered as
// visible markup, but they are real data on the page: every PDP inlines a
// `window.__STORE__ = {...}` blob (same script that drives the "please
// select a variation" popup and the /fragment/products/<id>/pictures image
// swapper), and `products[0].simples` is the actual per-size/color variant
// list — sku, price and stock per option, no second request needed. This
// was confirmed against 7 real live listings across 3 categories: sneakers
// ("EU 39".."EU 46", plus "EU 40 2/3"-style half sizes), clothing ("S".."
// XXXXL"), and — from the 4 existing product-page fixtures, checked while
// wiring this up — letter sizes with an EU prefix too ("EU M", "EU L"). No
// example with a genuine color axis turned up in that investigation, so
// looksLikeSize() only classifies what was actually observed (an optional
// EU/UK/US prefix over either a letter grade or a number, with an optional
// half-size fraction) and leaves anything else in `other` rather than
// guessing it's a color.
const jumiaStoreSimpleSchema = z.object({
  sku: z.string(),
  name: z.string(),
  isBuyable: z.boolean().optional().default(true),
  prices: z.object({ rawPrice: z.string().optional() }).optional(),
});

const jumiaStoreProductSchema = z.object({
  simples: z.array(jumiaStoreSimpleSchema).optional().default([]),
});

const jumiaStoreSchema = z.object({
  products: z.array(jumiaStoreProductSchema).optional().default([]),
});

type JumiaStoreSimple = z.infer<typeof jumiaStoreSimpleSchema>;

function extractStoreSimples(html: string): JumiaStoreSimple[] {
  const match = html.match(/window\.__STORE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match) return [];
  try {
    const parsed = jumiaStoreSchema.safeParse(JSON.parse(match[1]));
    return parsed.success ? (parsed.data.products[0]?.simples ?? []) : [];
  } catch {
    return [];
  }
}

function looksLikeSize(value: string): boolean {
  const v = value.trim().replace(/^(EU|UK|US)\s?/i, '');
  return /^X{0,3}(S|M|L)$/i.test(v) || /^\d+(\.\d+)?(\s?\d\/\d)?$/.test(v);
}

export const jumiaVariantSchema = z.object({
  externalId: z.string(),
  sku: z.string(),
  size: z.string().nullable(),
  other: z.string().nullable(),
  priceCents: z.number().nullable(),
  available: z.boolean(),
});

export type JumiaVariant = z.infer<typeof jumiaVariantSchema>;

export const jumiaRawSchema = z.object({
  productId: z.string(),
  url: z.string(),
  title: z.string(),
  descriptionText: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  available: z.boolean(),
  images: z.array(z.string()),
  variants: z.array(jumiaVariantSchema),
});

export type JumiaRawProduct = z.infer<typeof jumiaRawSchema>;

export const jumiaAdapter: ScraperAdapter = {
  key: 'jumia',
  displayName: 'Jumia',
  priority: 60,
  // The 8 country domains that resolved to a live storefront during
  // investigation (Jumia has since exited South Africa, Tunisia, Tanzania,
  // Cameroon and Algeria; those domains either dead-end or redirect to
  // group.jumia.com, so they're deliberately excluded).
  hostPatterns: [/\.jumia\.(com\.ng|co\.ke|com\.eg|com\.gh|ma|ug|ci|sn)$/],
  capabilities: new Set(['detect', 'getProduct', 'buyDeepLink', 'getVariants']),
  rawSchema: jumiaRawSchema,

  async detect(_page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
    return { match: false, confidence: 0, signals: [] };
  },

  async getProduct(url: URL, ctx: Ctx): Promise<Result<JumiaRawProduct>> {
    let html: string;
    try {
      const res = await ctx.fetch(url.toString());
      if (!res.ok) {
        return err({ code: 'SCRAPE_FAILED', message: `Jumia fetch failed: ${res.status}` });
      }
      html = await res.text();
    } catch (cause) {
      return err({ code: 'SCRAPE_FAILED', message: 'Jumia fetch threw', cause });
    }

    const product = findJumiaProduct(extractJsonLdBlocks(html));
    const meta = extractMetaTags(html);
    const title = product?.name ?? meta['og:title'] ?? extractTitleTag(html);
    if (!title) {
      return err({ code: 'SCRAPE_FAILED', message: 'No product data found on Jumia page' });
    }

    const images = product?.image?.contentUrl?.length
      ? product.image.contentUrl.map((src) => toAbsoluteUrl(src, url.toString()))
      : meta['og:image']
        ? [toAbsoluteUrl(meta['og:image'], url.toString())]
        : [];

    const variants = extractStoreSimples(html).map((simple) => {
      const isSize = looksLikeSize(simple.name);
      return {
        externalId: simple.sku,
        sku: simple.sku,
        size: isSize ? simple.name : null,
        other: isSize ? null : simple.name,
        priceCents: parsePriceStringToCents(simple.prices?.rawPrice ?? null),
        available: simple.isBuyable,
      };
    });

    return ok({
      productId: extractProductId(url),
      url: url.toString(),
      title,
      descriptionText: product?.description ?? meta['og:description'] ?? '',
      priceCents: parsePriceStringToCents(product?.offers?.price ?? null),
      currency: product?.offers?.priceCurrency ?? null,
      available: !/OutOfStock/i.test(product?.offers?.availability ?? ''),
      images,
      variants,
    });
  },

  buyDeepLink(product: NormalizedProduct): string | null {
    return product.url;
  },

  normalize(raw: JumiaRawProduct): Result<NormalizedProduct> {
    if (!raw.images.length) {
      return err({ code: 'INVALID_INPUT', message: 'Product has no images' });
    }

    const sizes = [...new Set(raw.variants.map((v) => v.size).filter((s): s is string => !!s))];
    const options = sizes.length ? [{ name: 'Size', values: sizes }] : [];

    return ok({
      externalId: raw.productId,
      handle: raw.productId,
      title: raw.title,
      url: raw.url,
      buyUrl: raw.url,
      brand: null,
      productType: null,
      tags: [],
      descriptionText: raw.descriptionText,
      priceCents: raw.priceCents,
      currency: raw.currency,
      available: raw.available,
      images: raw.images.map((imageUrl, position) => ({
        url: imageUrl,
        alt: null,
        width: null,
        height: null,
        position,
        // No per-variant image mapping was found in window.__STORE__ (each
        // simple has no image field of its own), so this is left empty
        // rather than falsely claiming every image applies to every variant.
        variantIds: [],
      })),
      variants: raw.variants.map((v) => ({
        externalId: v.externalId,
        sku: v.sku,
        size: v.size,
        color: null,
        other: v.other,
        priceCents: v.priceCents,
        available: v.available,
        imageUrl: null,
      })),
      options,
      externalUpdatedAt: null,
      raw,
    });
  },
};
