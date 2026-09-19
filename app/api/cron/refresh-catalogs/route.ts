import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { findStoresDueForRefresh } from '@/db/repos/stores';
import { scraperRegistry } from '@/modules/scraper';
import { enqueueJob } from '@/modules/jobs';

export const dynamic = 'force-dynamic';

const STALE_AFTER_HOURS = 24;

/**
 * daily; for every store whose adapter can list a catalog and
 * hasn't been crawled in 24h, enqueue a `store.crawled` job (the actual
 * crawl runs in `GET /api/cron/jobs`'s drain loop, not inline here; a
 * catalog crawl per store can be slow, and this route just seeds the queue
 * so one slow store can't blow the function's own timeout budget).
 */
export const GET = apiHandler({
  name: 'cron.refreshCatalogs',
  auth: ['cron'],
  handler: async () => {
    const dueStores = await findStoresDueForRefresh(STALE_AFTER_HOURS);
    let enqueued = 0;

    for (const store of dueStores) {
      if (!scraperRegistry.supports(store.platform, 'listProducts')) continue;
      await enqueueJob('store.crawled', { storeId: store.id });
      enqueued++;
    }

    return ok({ storesDue: dueStores.length, enqueued });
  },
});
