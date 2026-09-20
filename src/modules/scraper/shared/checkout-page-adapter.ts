import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { Platform } from '@/db/schema';
import type { DetectResult, HomepageProbe, ScraperAdapter } from '../types';
import type { NormalizedProduct } from '../schema';
import { productPageRawSchema, scrapeJsonLdProductPage, type ProductPageRaw } from './product-page';

export type CheckoutPageAdapterConfig = {
  key: Platform;
  displayName: string;
  priority: number;
  hostPatterns: RegExp[];
};

// Confirmed against real Gumroad/Big Cartel checkout pages, which expose
// og:title/og:image and a price meta tag (product:price:amount on Gumroad,
// og:price:amount on Big Cartel) that scrapeJsonLdProductPage's existing
// OpenGraph fallback already reads.
export function createCheckoutPageAdapter(config: CheckoutPageAdapterConfig): ScraperAdapter {
  return {
    key: config.key,
    displayName: config.displayName,
    priority: config.priority,
    hostPatterns: config.hostPatterns,
    capabilities: new Set(['detect', 'getProduct', 'buyDeepLink']),
    rawSchema: productPageRawSchema,

    async detect(_page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
      return { match: false, confidence: 0, signals: [] };
    },

    async getProduct(url: URL, ctx: Ctx): Promise<Result<ProductPageRaw>> {
      return scrapeJsonLdProductPage(url, ctx);
    },

    buyDeepLink(product: NormalizedProduct): string | null {
      return product.url;
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
