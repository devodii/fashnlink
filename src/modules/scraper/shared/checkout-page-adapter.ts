import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, PlatformKey, ScraperAdapter } from '../types';
import type { NormalizedProduct } from '../schema';
import { productPageRawSchema, scrapeJsonLdProductPage, type ProductPageRaw } from './product-page';

export type CheckoutPageAdapterConfig = {
  key: PlatformKey;
  displayName: string;
  priority: number;
  hostPatterns: RegExp[];
};

/**
 * lemonsqueezy/gumroad/bigcartel; "getProduct from the
 * checkout/buy page (og:image, og:title, price from the page's JSON state),
 * buyDeepLink = the same URL. No catalog." These are host-pattern-only
 * (never resolved via homepage detection; confirmed against real
 * gumroad/bigcartel checkout pages, which expose `og:title`/`og:image` and
 * a price meta tag (`product:price:amount` on Gumroad, `og:price:amount` on
 * Big Cartel) that `scrapeJsonLdProductPage`'s existing OpenGraph fallback
 * already reads; no separate parser needed for those two.
 */
export function createCheckoutPageAdapter(config: CheckoutPageAdapterConfig): ScraperAdapter {
  return {
    key: config.key,
    displayName: config.displayName,
    priority: config.priority,
    hostPatterns: config.hostPatterns,
    /**
     * No `listProducts` capability; section 6.5 is explicit that these
     * adapters have no catalog.
     */
    capabilities: new Set(['detect', 'getProduct', 'buyDeepLink']),
    rawSchema: productPageRawSchema,

    async detect(_page: HomepageProbe, _ctx: Ctx): Promise<DetectResult> {
      /**
       * Never resolved via homepage probe; only `hostPatterns` ever matches
       * these (a merchant pastes a specific checkout/buy link, there is no
       * browsable store homepage to detect from).
       */
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
