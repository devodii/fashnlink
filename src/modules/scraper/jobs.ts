import { createHash } from 'node:crypto';
import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import { registerJobHandler } from '@/modules/jobs/registry';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { findStoreById, touchStoreCrawled } from '@/db/repos/stores';
import { findProductByExternalId, refreshProductLiveFields } from '@/db/repos/products';
import { scraperRegistry } from './index';

const payloadSchema = z.object({ storeId: z.string() });

/**
 * catalog refresh, reached two ways; reactively, one job
 * per store, enqueued by `scrapeUrl` after any single-product scrape
 * ; and proactively by the `refresh-catalogs` cron
 * (below), which enqueues one per eligible store on a schedule. Both funnel
 * through this one handler so there is exactly one catalog-crawl code path.
 *
 * DECISION: scoped to REFRESHING products that already exist (price,
 * availability, freshness); first page of `listProducts` only, no
 * pagination loop, no new-product discovery. Running the full wearable-gate
 * + vision/Jev enrichment pipeline (`scrapeUrl`'s product-mode path) against
 * an entire catalog on every refresh would be far more expensive than what a
 * "keep known products' live fields current" cron needs, and that pipeline
 * isn't currently factored out into a reusable single-product function this
 * handler could call per catalog item without duplicating it. Discovering
 * brand-new catalog products this way is a real gap, not silently pretended
 * otherwise; it's the same "paste it yourself" path (onboarding / new link)
 * until a future pass extracts that pipeline into something this can reuse.
 */
registerJobHandler('store.crawled', async (payload): Promise<Result<void>> => {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success)
    return err({ code: 'INVALID_INPUT', message: 'invalid store.crawled payload' });

  const store = await findStoreById(parsed.data.storeId);
  if (!store) return err({ code: 'NOT_FOUND', message: 'store not found' });

  const adapter = scraperRegistry.get(store.platform);
  if (!adapter?.listProducts) {
    await touchStoreCrawled(store.id);
    return ok(undefined);
  }

  const log = childLogger('store-crawled-job', { storeId: store.id });
  const ctx = {
    log,
    requestId: 'store-crawled-job',
    deadlineMs: Date.now() + 55_000,
    fetch: createFetch({ log }),
  };

  const page = await adapter.listProducts(
    { domain: store.domain, platform: store.platform },
    null,
    ctx,
  );
  if (!page.ok) return page;

  for (const raw of page.value.items) {
    const normalized = adapter.normalize(raw);
    if (!normalized.ok) continue;
    const product = normalized.value;

    const existing = await findProductByExternalId(store.id, product.externalId);
    if (!existing) continue; // new-product discovery: see DECISION above

    const contentHash = createHash('sha256')
      .update(
        JSON.stringify({
          title: product.title,
          priceCents: product.priceCents,
          available: product.available,
        }),
      )
      .digest('hex');
    if (contentHash === existing.contentHash) continue;

    await refreshProductLiveFields(existing.id, {
      title: product.title,
      priceCents: product.priceCents,
      currency: product.currency,
      available: product.available,
      externalUpdatedAt: product.externalUpdatedAt ? new Date(product.externalUpdatedAt) : null,
      contentHash,
    });
  }

  await touchStoreCrawled(store.id);
  return ok(undefined);
});
