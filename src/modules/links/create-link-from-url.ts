import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { scrapeUrl } from '@/modules/scraper';
import { readStore } from '@/actions/stores';
import { readProduct } from '@/actions/products';
import { createLink } from '@/actions/links';

export type CreatedLink = {
  linkId: string;
  slug: string;
  productId: string;
  productTitle: string;
};

export type ScrapedProductRef = { productId: string; productTitle: string };

export async function scrapeUrlToProduct(
  rawUrl: string,
  merchantId: string,
  ctx: Ctx,
): Promise<Result<ScrapedProductRef>> {
  const scraped = await scrapeUrl(rawUrl, { mode: 'product', merchantId }, ctx);
  if (!scraped.ok) return scraped;

  const product = scraped.value.products[0];
  if (!product) return err({ code: 'INTERNAL', message: 'Scrape produced no product' });

  const hostname = new URL(rawUrl).hostname;
  const store = await readStore({ domain: hostname });
  if (!store) return err({ code: 'INTERNAL', message: 'Store not found after scrape' });

  const saved = await readProduct({ storeId: store.id, externalId: product.externalId });
  if (!saved) return err({ code: 'INTERNAL', message: 'Product not found after scrape' });

  return ok({ productId: saved.id, productTitle: product.title });
}

export async function createLinkFromUrl(
  rawUrl: string,
  merchantId: string,
  ctx: Ctx,
): Promise<Result<CreatedLink>> {
  const product = await scrapeUrlToProduct(rawUrl, merchantId, ctx);
  if (!product.ok) return product;

  const link = await createLink({ kind: 'single', merchantId, productId: product.value.productId });
  if (!link) return err({ code: 'INTERNAL', message: 'Failed to create link' });

  return ok({
    linkId: link.id,
    slug: link.slug,
    productId: product.value.productId,
    productTitle: product.value.productTitle,
  });
}

export type CreatedMultiLink = { linkId: string; slug: string; products: ScrapedProductRef[] };

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

  const link = await createLink({
    kind: 'poll',
    merchantId,
    productIds: products.map((p) => p.productId),
  });
  if (!link) return err({ code: 'INTERNAL', message: 'Failed to create poll link' });

  return ok({ linkId: link.id, slug: link.slug, products });
}

export async function createGroupLinkFromUrl(
  rawUrl: string,
  merchantId: string,
  groupName: string,
  groupNote: string | null,
  ctx: Ctx,
): Promise<Result<CreatedLink>> {
  const product = await scrapeUrlToProduct(rawUrl, merchantId, ctx);
  if (!product.ok) return product;

  const link = await createLink({
    kind: 'group',
    merchantId,
    productIds: [product.value.productId],
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
