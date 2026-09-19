import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter, StoreRef } from '../types';
import type { NormalizedProduct } from '../schema';
import { discoverProductUrls } from '../shared/sitemap';
import {
  productPageRawSchema,
  scrapeJsonLdProductPage,
  type ProductPageRaw,
} from '../shared/product-page';

/**
 * ; the fallback of last resort, and every "thin" platform
 * adapter leans on the same shared/product-page.ts scraper rather than
 * reimplementing JSON-LD/OpenGraph parsing.
 */
export const genericAdapter: ScraperAdapter = {
  key: 'generic',
  displayName: 'Generic (JSON-LD / OpenGraph)',
  /**
   * Lowest priority; always matches, only used once every specific adapter
   * has declined.
   */
  priority: 1000,
  capabilities: new Set(['detect', 'getProduct', 'listProducts']),
  rawSchema: productPageRawSchema,

  async detect(_page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
    return { match: true, confidence: 0.1, signals: ['fallback'] };
  },

  async getProduct(url: URL, ctx: Ctx): Promise<Result<ProductPageRaw>> {
    return scrapeJsonLdProductPage(url, ctx);
  },

  async listProducts(store: StoreRef, _cursor, ctx: Ctx) {
    try {
      const origin = `https://${store.domain}`;
      const urls = await discoverProductUrls(origin, ctx, { maxProducts: 200 });
      const items: ProductPageRaw[] = [];
      for (const url of urls) {
        const result = await scrapeJsonLdProductPage(new URL(url), ctx);
        if (result.ok) items.push(result.value);
      }
      return ok({ items, next: null });
    } catch (cause) {
      return err({ code: 'SCRAPE_FAILED', message: 'listProducts failed', cause });
    }
  },

  normalize(raw: ProductPageRaw): Result<NormalizedProduct> {
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
