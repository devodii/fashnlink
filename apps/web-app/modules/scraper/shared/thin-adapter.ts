import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { Platform } from '@tryonlink/shared/schema';
import type { DetectResult, HomepageProbe, ScraperAdapter, StoreRef } from '../types';
import type { NormalizedProduct } from '../schema';
import { detectSignalsFor } from '../detect';
import { discoverProductUrls } from './sitemap';
import { productPageRawSchema, scrapeJsonLdProductPage, type ProductPageRaw } from './product-page';

export type ThinAdapterConfig = {
  key: Platform;
  displayName: string;
  priority: number;
  hostPatterns?: RegExp[];
  sitemapNameFilter?: RegExp;
};

export function createThinJsonLdAdapter(config: ThinAdapterConfig): ScraperAdapter {
  return {
    key: config.key,
    displayName: config.displayName,
    priority: config.priority,
    hostPatterns: config.hostPatterns,
    capabilities: new Set(['detect', 'getProduct', 'listProducts']),
    rawSchema: productPageRawSchema,

    async detect(page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
      return detectSignalsFor(config.key, page);
    },

    async getProduct(url: URL, ctx: Ctx): Promise<Result<ProductPageRaw>> {
      return scrapeJsonLdProductPage(url, ctx);
    },

    async listProducts(store: StoreRef, _cursor, ctx: Ctx) {
      try {
        const origin = `https://${store.domain}`;
        const urls = await discoverProductUrls(origin, ctx, {
          maxProducts: 200,
          sitemapNameFilter: config.sitemapNameFilter,
        });
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
}
