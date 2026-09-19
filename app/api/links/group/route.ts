import { z } from 'zod';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { ok } from '@/lib/result';
import { createGroupLinkFromUrl } from '@/modules/links/create-link-from-url';
import { SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR } from '@/config/limits';

const bodySchema = z.object({
  url: z.string().url(),
  groupName: z.string().min(1).max(80),
  groupNote: z.string().max(280).nullable().optional(),
});

export const POST = apiHandler({
  name: 'links.createGroupFromUrl',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  rateLimit: {
    key: (args) =>
      `scrape:${args.auth.type === 'merchant_session' ? args.auth.merchantId : 'unknown'}`,
    limit: SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR,
    windowSeconds: 3600,
  },
  handler: async ({ body, auth, requestId }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const log = childLogger(requestId, { route: 'links.createGroupFromUrl' });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    const result = await createGroupLinkFromUrl(
      body.url,
      merchant.value.merchantId,
      body.groupName,
      body.groupNote ?? null,
      ctx,
    );
    if (!result.ok) return result;

    return ok(result.value);
  },
});
