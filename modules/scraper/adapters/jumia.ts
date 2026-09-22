import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import type { DetectResult, HomepageProbe, ScraperAdapter } from '../types';
import type { NormalizedProduct } from '../schema';
import { extractJsonLdBlocks } from '../shared/jsonld';
import { extractMetaTags, extractTitleTag } from '../shared/opengraph';
import { parsePriceStringToCents, toAbsoluteUrl } from '@/lib/util';

// Confirmed against 2 real Jumia Nigeria product pages (see jumia.test.ts):
// the JSON-LD Product lives at `ItemPage.mainEntity`, not at the block's top
// level or inside an `@graph` array, so shared/jsonld.ts's findProduct()
// never sees it; its images are `ImageObject.contentUrl` (an array), not the
// `.url` shape jsonLdImages() reads. There's also no og:price/product:price
// meta tag at all, so shared/product-page.ts's OG fallback can't recover
// price either. Both gaps are why this is a bespoke adapter instead of
// createCheckoutPageAdapter.

const jumiaOfferSchema = z.object({
  price: z.union([z.string(), z.number()]).optional(),
  priceCurrency: z.string().optional(),
  availability: z.string().optional(),
});

const jumiaJsonLdProductSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  offers: jumiaOfferSchema.optional(),
  image: z.object({ contentUrl: z.array(z.string()).optional() }).optional(),
});

type JumiaJsonLdProduct = z.infer<typeof jumiaJsonLdProductSchema>;

function findJumiaProduct(blocks: unknown[]): JumiaJsonLdProduct | null {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const parsed = jumiaJsonLdProductSchema.safeParse(
      (block as Record<string, unknown>).mainEntity,
    );
    if (parsed.success) return parsed.data;
  }
  return null;
}

// Real Jumia product URLs end in `-<numeric id>.html` (verified against
// hundreds of live URLs via the Wayback CDX index, not just the 2 fixtures).
function extractProductId(url: URL): string {
  return url.pathname.match(/-(\d+)\.html$/)?.[1] ?? url.toString();
}

export const jumiaRawSchema = z.object({
  productId: z.string(),
  url: z.string(),
  title: z.string(),
  descriptionText: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  available: z.boolean(),
  images: z.array(z.string()),
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
  capabilities: new Set(['detect', 'getProduct', 'buyDeepLink']),
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

    return ok({
      productId: extractProductId(url),
      url: url.toString(),
      title,
      descriptionText: product?.description ?? meta['og:description'] ?? '',
      priceCents: parsePriceStringToCents(product?.offers?.price ?? null),
      currency: product?.offers?.priceCurrency ?? null,
      available: !/OutOfStock/i.test(product?.offers?.availability ?? ''),
      images,
    });
  },

  buyDeepLink(product: NormalizedProduct): string | null {
    return product.url;
  },

  normalize(raw: JumiaRawProduct): Result<NormalizedProduct> {
    if (!raw.images.length) {
      return err({ code: 'INVALID_INPUT', message: 'Product has no images' });
    }
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
        variantIds: [],
      })),
      // No size/color selector data appears in the server-rendered page for
      // either fixture; Jumia's PDP hydrates variant switching client-side
      // from an endpoint not reverse-engineered here.
      variants: [],
      options: [],
      externalUpdatedAt: null,
      raw,
    });
  },
};
