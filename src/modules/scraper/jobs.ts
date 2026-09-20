import { createHash } from 'node:crypto';
import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import { registerJobHandler } from '@/modules/jobs/registry';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { readStore, updateStore } from '@/actions/stores';
import { readProduct, updateProduct } from '@/actions/products';
import { scraperRegistry } from './index';

const payloadSchema = z.object({ storeId: z.string() });

/**
 * Scoped to refreshing products that already exist (price, availability,
 * freshness) from the first page of listProducts only. It does not discover
 * new catalog products: running the full wearable-gate and vision/Jev
 * enrichment pipeline against an entire catalog on every refresh would be
 * far more expensive than this cron needs, and that pipeline is not
 * currently factored out into a reusable single-product function. New
 * products still need to be pasted in manually (onboarding / new link).
 */
registerJobHandler('store.crawled', async (payload): Promise<Result<void>> => {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success)
    return err({ code: 'INVALID_INPUT', message: 'invalid store.crawled payload' });

  const store = await readStore({ id: parsed.data.storeId });
  if (!store) return err({ code: 'NOT_FOUND', message: 'store not found' });

  const adapter = scraperRegistry.get(store.platform);
  if (!adapter?.listProducts) {
    await updateStore(store.id, { lastCrawledAt: new Date() });
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

    const existing = await readProduct({ storeId: store.id, externalId: product.externalId });
    if (!existing) continue;

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

    await updateProduct(existing.id, {
      title: product.title,
      priceCents: product.priceCents,
      currency: product.currency,
      available: product.available,
      externalUpdatedAt: product.externalUpdatedAt ? new Date(product.externalUpdatedAt) : null,
      contentHash,
    });
  }

  await updateStore(store.id, { lastCrawledAt: new Date() });
  return ok(undefined);
});
