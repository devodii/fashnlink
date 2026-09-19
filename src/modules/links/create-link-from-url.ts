import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { scrapeUrl } from '@/modules/scraper';
import { findStoreByDomain } from '@/db/repos/stores';
import { findProductByExternalId } from '@/db/repos/products';
import { createSingleLink } from '@/db/repos/links';

export type CreatedLink = {
  linkId: string;
  slug: string;
  productId: string;
  productTitle: string;
};

// Shared by `/onboarding` step 1 and `/dashboard/links/new` (spec section
// 12/M5: "reuses the exact same scraping pipeline as onboarding step 1 —
// don't duplicate the logic"). Wraps M2's `scrapeUrl` (which persists the
// product) with the one piece it doesn't do: creating a `links` row owning
// that product for this merchant.
export async function createLinkFromUrl(
  rawUrl: string,
  merchantId: string,
  ctx: Ctx,
): Promise<Result<CreatedLink>> {
  const scraped = await scrapeUrl(rawUrl, { mode: 'product', merchantId }, ctx);
  if (!scraped.ok) return scraped;

  const product = scraped.value.products[0];
  if (!product) return err({ code: 'INTERNAL', message: 'Scrape produced no product' });

  // Hostname only — the full normalizeUrl (protocol/tracking-param
  // stripping) lives inside `scrapeUrl` itself and isn't exported; the
  // store lookup only ever keys on hostname, which query stripping can't
  // change anyway.
  const hostname = new URL(rawUrl).hostname;
  const store = await findStoreByDomain(hostname);
  if (!store) return err({ code: 'INTERNAL', message: 'Store not found after scrape' });

  const saved = await findProductByExternalId(store.id, product.externalId);
  if (!saved) return err({ code: 'INTERNAL', message: 'Product not found after scrape' });

  const link = await createSingleLink({ merchantId, productId: saved.id });
  if (!link) return err({ code: 'INTERNAL', message: 'Failed to create link' });

  return ok({ linkId: link.id, slug: link.slug, productId: saved.id, productTitle: product.title });
}
