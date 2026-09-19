import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter, StoreRef } from '../types';
import type { NormalizedProduct } from '../schema';
import { discoverProductUrls } from '../shared/sitemap';
import {
  extractJsonLdBlocks,
  findProduct,
  jsonLdAvailable,
  jsonLdBrand,
  jsonLdImages,
  jsonLdOffers,
  jsonLdPriceCents,
} from '../shared/jsonld';
import { extractH1, extractMetaTags, extractTitleTag } from '../shared/opengraph';
import { toAbsoluteUrl } from '../shared/images';
import { parsePriceStringToCents } from '../shared/price';

// Section 6.5 — the fallback of last resort, and every other "thin" platform
// adapter (not built in this pass) leans on the same JSON-LD/OpenGraph chain
// via these shared helpers rather than reimplementing parsing.

const genericRawSchema = z.object({
  url: z.string(),
  title: z.string(),
  descriptionText: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  available: z.boolean(),
  images: z.array(z.string()),
  brand: z.string().nullable(),
});

type GenericRaw = z.infer<typeof genericRawSchema>;

async function fetchProductPage(url: URL, ctx: Ctx): Promise<Result<{ html: string }>> {
  try {
    const res = await ctx.fetch(url.toString());
    if (!res.ok) return err({ code: 'SCRAPE_FAILED', message: `Fetch failed: ${res.status}` });
    return ok({ html: await res.text() });
  } catch (cause) {
    return err({ code: 'SCRAPE_FAILED', message: 'Fetch threw', cause });
  }
}

// Standalone (not a `this.getProduct` call) so `listProducts` gets the
// concrete `GenericRaw` return type instead of the interface's widened
// `RawProduct` (`this` inside an object-literal method typed against the
// `ScraperAdapter` interface only knows the interface's own signatures).
async function getGenericProduct(url: URL, ctx: Ctx): Promise<Result<GenericRaw>> {
  const pageResult = await fetchProductPage(url, ctx);
  if (!pageResult.ok) return pageResult;
  const { html } = pageResult.value;

  const jsonLdBlocks = extractJsonLdBlocks(html);
  const product = findProduct(jsonLdBlocks);
  const meta = extractMetaTags(html);

  if (product) {
    const offers = jsonLdOffers(product.offers);
    const images = jsonLdImages(product.image).map((img) => toAbsoluteUrl(img, url.toString()));
    return ok({
      url: url.toString(),
      title: product.name ?? extractTitleTag(html) ?? extractH1(html) ?? 'Untitled product',
      descriptionText: product.description ?? '',
      priceCents: jsonLdPriceCents(offers),
      currency: offers[0]?.priceCurrency ?? null,
      available: jsonLdAvailable(offers),
      images: images.length
        ? images
        : meta['og:image']
          ? [toAbsoluteUrl(meta['og:image'], url.toString())]
          : [],
      brand: jsonLdBrand(product.brand),
    });
  }

  const title = meta['og:title'] ?? extractTitleTag(html) ?? extractH1(html);
  if (!title) {
    return err({
      code: 'SCRAPE_FAILED',
      message: 'No product data found (no JSON-LD, no OG title)',
    });
  }

  const priceAmount = meta['product:price:amount'] ?? meta['og:price:amount'];
  const priceCents = priceAmount ? parsePriceStringToCents(priceAmount) : null;

  return ok({
    url: url.toString(),
    title,
    descriptionText: meta['og:description'] ?? '',
    priceCents,
    currency: meta['product:price:currency'] ?? meta['og:price:currency'] ?? null,
    available: true,
    images: meta['og:image'] ? [toAbsoluteUrl(meta['og:image'], url.toString())] : [],
    brand: null,
  });
}

export const genericAdapter: ScraperAdapter = {
  key: 'generic',
  displayName: 'Generic (JSON-LD / OpenGraph)',
  // Lowest priority — always matches, only used once every specific adapter
  // has declined (section 6.2/6.5).
  priority: 1000,
  capabilities: new Set(['detect', 'getProduct', 'listProducts']),
  rawSchema: genericRawSchema,

  async detect(_page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
    return { match: true, confidence: 0.1, signals: ['fallback'] };
  },

  async getProduct(url: URL, ctx: Ctx): Promise<Result<GenericRaw>> {
    return getGenericProduct(url, ctx);
  },

  async listProducts(store: StoreRef, _cursor, ctx: Ctx) {
    try {
      const origin = `https://${store.domain}`;
      const urls = await discoverProductUrls(origin, ctx, { maxProducts: 200 });
      const items: GenericRaw[] = [];
      for (const url of urls) {
        const result = await getGenericProduct(new URL(url), ctx);
        if (result.ok) items.push(result.value);
      }
      return ok({ items, next: null });
    } catch (cause) {
      return err({ code: 'SCRAPE_FAILED', message: 'listProducts failed', cause });
    }
  },

  normalize(raw: GenericRaw): Result<NormalizedProduct> {
    if (!raw.images.length) {
      return err({ code: 'INVALID_INPUT', message: 'Product has no images' });
    }
    const handle = new URL(raw.url).pathname.split('/').filter(Boolean).pop() ?? raw.url;
    return ok({
      externalId: raw.url,
      handle,
      title: raw.title,
      url: raw.url,
      buyUrl: raw.url,
      brand: raw.brand,
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
        variantIds: [],
      })),
      variants: [],
      options: [],
      externalUpdatedAt: null,
      raw,
    });
  },
};
