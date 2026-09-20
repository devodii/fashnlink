import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { readStore } from '@/actions/stores';
import { scraperRegistry } from '@/modules/scraper';
import { enqueueJobs } from '@/modules/jobs';

export const dynamic = 'force-dynamic';

const STALE_AFTER_HOURS = 24;

/**
 * The actual crawl runs in `GET /api/cron/jobs`'s drain loop, not inline
 * here; a catalog crawl per store can be slow, and this route just seeds the
 * queue so one slow store can't blow the function's own timeout budget.
 */
export const GET = apiHandler({
  name: 'cron.refreshCatalogs',
  auth: ['cron'],
  handler: async () => {
    const dueStores = await readStore({ dueForRefresh: STALE_AFTER_HOURS });
    const crawlableStores = dueStores.filter((store) =>
      scraperRegistry.supports(store.platform, 'listProducts'),
    );

    await enqueueJobs(
      crawlableStores.map((store) => ({ type: 'store.crawled', payload: { storeId: store.id } })),
    );

    return ok({ storesDue: dueStores.length, enqueued: crawlableStores.length });
  },
});
