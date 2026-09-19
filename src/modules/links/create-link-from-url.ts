import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { scrapeUrl } from '@/modules/scraper';
import { findStoreByDomain } from '@/db/repos/stores';
import { findProductByExternalId } from '@/db/repos/products';
import { createMultiProductLink, createSingleLink } from '@/db/repos/links';

export type CreatedLink = {
  linkId: string;
  slug: string;
  productId: string;
  productTitle: string;
};

export type ScrapedProductRef = { productId: string; productTitle: string };

/**
 * Extracted from `createLinkFromUrl` (M6) so poll-link creation can scrape
 * several URLs without creating a `links` row per URL. Wraps M2's `scrapeUrl`
 * (which persists the product) plus the store/product lookup every caller
 * needs afterward.
 */
export async function scrapeUrlToProduct(
  rawUrl: string,
  merchantId: string,
  ctx: Ctx,
): Promise<Result<ScrapedProductRef>> {
  const scraped = await scrapeUrl(rawUrl, { mode: 'product', merchantId }, ctx);
  if (!scraped.ok) return scraped;

  const product = scraped.value.products[0];
  if (!product) return err({ code: 'INTERNAL', message: 'Scrape produced no product' });

  /**
   * Hostname only; the full normalizeUrl (protocol/tracking-param
   * stripping) lives inside `scrapeUrl` itself and isn't exported; the
   * store lookup only ever keys on hostname, which query stripping can't
   * change anyway.
   */
  const hostname = new URL(rawUrl).hostname;
  const store = await findStoreByDomain(hostname);
  if (!store) return err({ code: 'INTERNAL', message: 'Store not found after scrape' });

  const saved = await findProductByExternalId(store.id, product.externalId);
  if (!saved) return err({ code: 'INTERNAL', message: 'Product not found after scrape' });

  return ok({ productId: saved.id, productTitle: product.title });
}

/**
 * Shared by `/onboarding` step 1 and `/dashboard/links/new` (spec section
 * 12/M5: "reuses the exact same scraping pipeline as onboarding step 1 ;
 * don't duplicate the logic").
 */
export async function createLinkFromUrl(
  rawUrl: string,
  merchantId: string,
  ctx: Ctx,
): Promise<Result<CreatedLink>> {
  const product = await scrapeUrlToProduct(rawUrl, merchantId, ctx);
  if (!product.ok) return product;

  const link = await createSingleLink({ merchantId, productId: product.value.productId });
  if (!link) return err({ code: 'INTERNAL', message: 'Failed to create link' });

  return ok({
    linkId: link.id,
    slug: link.slug,
    productId: product.value.productId,
    productTitle: product.value.productTitle,
  });
}

export type CreatedMultiLink = { linkId: string; slug: string; products: ScrapedProductRef[] };

/**
 * 2-3 product URLs -> one `links` row,
 * `kind: 'poll'`. Scrapes sequentially so a mid-list failure reports which
 * URL failed rather than an opaque Promise.all rejection.
 */
export async function createPollLinkFromUrls(
  rawUrls: string[],
  merchantId: string,
  ctx: Ctx,
): Promise<Result<CreatedMultiLink>> {
  if (rawUrls.length < 2 || rawUrls.length > 3) {
    return err({ code: 'INVALID_INPUT', message: 'A poll needs 2 or 3 products' });
  }

  const products: ScrapedProductRef[] = [];
  for (const url of rawUrls) {
    const scraped = await scrapeUrlToProduct(url, merchantId, ctx);
    if (!scraped.ok) return scraped;
    products.push(scraped.value);
  }

  const link = await createMultiProductLink({
    merchantId,
    productIds: products.map((p) => p.productId),
    kind: 'poll',
  });
  if (!link) return err({ code: 'INTERNAL', message: 'Failed to create poll link' });

  return ok({ linkId: link.id, slug: link.slug, products });
}

/**
 * a group link owns exactly one product (the shared style);
 * `settings.groupName`/`settings.groupNote` drive `/t/[slug]`'s group UI.
 */
export async function createGroupLinkFromUrl(
  rawUrl: string,
  merchantId: string,
  groupName: string,
  groupNote: string | null,
  ctx: Ctx,
): Promise<Result<CreatedLink>> {
  const product = await scrapeUrlToProduct(rawUrl, merchantId, ctx);
  if (!product.ok) return product;

  const link = await createMultiProductLink({
    merchantId,
    productIds: [product.value.productId],
    kind: 'group',
    title: groupName,
    settings: { groupName, groupNote },
  });
  if (!link) return err({ code: 'INTERNAL', message: 'Failed to create group link' });

  return ok({
    linkId: link.id,
    slug: link.slug,
    productId: product.value.productId,
    productTitle: product.value.productTitle,
  });
}
