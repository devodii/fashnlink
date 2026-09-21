import { apiHandler } from '@/lib/api-handler';
import { createFetch } from '@/lib/http';
import { childLogger } from '@/lib/log';
import { drainJobs } from '@/modules/jobs';
import '@/modules/jobs/handlers';
import { ok } from '@/lib/result';

export const dynamic = 'force-dynamic';

/**
 * The handler registry `drainJobs` dispatches into starts empty; the
 * side-effecting `@/modules/jobs/handlers` import above is what registers
 * job types into it.
 */
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
