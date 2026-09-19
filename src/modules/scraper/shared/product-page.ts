import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import {
  extractJsonLdBlocks,
  findProduct,
  jsonLdAvailable,
  jsonLdBrand,
  jsonLdImages,
  jsonLdOffers,
  jsonLdPriceCents,
} from './jsonld';
import { extractH1, extractMetaTags, extractTitleTag } from './opengraph';
import { toAbsoluteUrl } from './images';
import { parsePriceStringToCents } from './price';

// Shared by `generic` and every "thin" platform adapter (wix, bigcommerce,
// magento, prestashop, salesforce — section 6.5: "thin files that mostly
// delegate to shared helpers jsonld.ts and sitemap.ts") — one JSON-LD-first,
// OpenGraph-fallback product page scraper, used everywhere instead of each
// adapter reimplementing it.

export const productPageRawSchema = z.object({
  url: z.string(),
  title: z.string(),
  descriptionText: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string().nullable(),
  available: z.boolean(),
  images: z.array(z.string()),
  brand: z.string().nullable(),
});

export type ProductPageRaw = z.infer<typeof productPageRawSchema>;

async function fetchProductPage(url: URL, ctx: Ctx): Promise<Result<{ html: string }>> {
  try {
    const res = await ctx.fetch(url.toString());
    if (!res.ok) return err({ code: 'SCRAPE_FAILED', message: `Fetch failed: ${res.status}` });
    return ok({ html: await res.text() });
  } catch (cause) {
    return err({ code: 'SCRAPE_FAILED', message: 'Fetch threw', cause });
  }
}

export async function scrapeJsonLdProductPage(url: URL, ctx: Ctx): Promise<Result<ProductPageRaw>> {
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
