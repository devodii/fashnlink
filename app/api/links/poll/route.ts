import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { ok } from '@/lib/result';
import { createPollLinkFromUrls } from '@/modules/links/create-link-from-url';
import { SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR } from '@/config/limits';

const bodySchema = z.object({ urls: z.array(z.string().url()).min(2).max(3) });

export const POST = apiHandler({
  name: 'links.createPollFromUrls',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  rateLimit: {
    key: (args) =>
      `scrape:${args.auth.type === 'merchant_session' ? args.auth.merchantId : 'unknown'}`,
    limit: SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR,
    windowSeconds: 3600,
  },
  handler: async ({ body, merchant, requestId }) => {
    const log = childLogger(requestId, { route: 'links.createPollFromUrls' });
    const ctx = { log, requestId, deadlineMs: Date.now() + 90_000, fetch: createFetch({ log }) };

    const result = await createPollLinkFromUrls(body.urls, merchant.merchantId, ctx);
    if (!result.ok) return result;

    return ok(result.value);
  },
});
