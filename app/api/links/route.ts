import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { ok } from '@/lib/result';
import {
  createLinkFromUrl,
  createGroupLinkFromUrl,
  createPollLinkFromUrls,
} from '@/modules/links/create-link-from-url';
import { SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR } from '@/constants';

const bodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('single'), url: z.string().url() }),
  z.object({
    kind: z.literal('group'),
    url: z.string().url(),
    groupName: z.string().min(1).max(80),
    groupNote: z.string().max(280).nullable().optional(),
  }),
  z.object({ kind: z.literal('poll'), urls: z.array(z.string().url()).min(2).max(3) }),
]);

export const POST = apiHandler({
  name: 'links.create',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  rateLimit: {
    key: (args) =>
      `scrape:${args.auth.type === 'merchant_session' ? args.auth.merchantId : 'unknown'}`,
    limit: SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR,
    windowSeconds: 3600,
  },
  handler: async ({ body, merchant, requestId }) => {
    const log = childLogger(requestId, { route: `links.create.${body.kind}` });
    const ctx = { log, requestId, deadlineMs: Date.now() + 90_000, fetch: createFetch({ log }) };

    if (body.kind === 'single') {
      const result = await createLinkFromUrl(body.url, merchant.merchantId, ctx);
      if (!result.ok) return result;
      return ok(result.value);
    }

    if (body.kind === 'group') {
      const result = await createGroupLinkFromUrl(
        body.url,
        merchant.merchantId,
        body.groupName,
        body.groupNote ?? null,
        ctx,
      );
      if (!result.ok) return result;
      return ok(result.value);
    }

    const result = await createPollLinkFromUrls(body.urls, merchant.merchantId, ctx);
    if (!result.ok) return result;
    return ok(result.value);
  },
});
