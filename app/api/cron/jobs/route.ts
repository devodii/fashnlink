import { apiHandler } from '@/lib/api-handler';
import { createFetch } from '@/lib/http';
import { childLogger } from '@/lib/log';
import { drainJobs } from '@/modules/jobs';
import '@/modules/jobs/handlers';
import { ok } from '@/lib/result';

export const dynamic = 'force-dynamic';

// Vercel Cron (section 8.4), protected by CRON_SECRET via apiHandler's 'cron'
// auth scope. Drains up to 50 due jobs per tick; the handler registry it
// dispatches into starts empty and fills in as later modules register their
// job types (section 12 M1 accept).
export const GET = apiHandler({
  name: 'cron.drainJobs',
  auth: ['cron'],
  handler: async ({ requestId }) => {
    const log = childLogger(requestId, { route: 'cron/jobs' });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    const summary = await drainJobs(ctx);
    log.info(summary, 'jobs drained');

    return ok(summary);
  },
});
