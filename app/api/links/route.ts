import { z } from 'zod';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { ok } from '@/lib/result';
import { createLinkFromUrl } from '@/modules/links/create-link-from-url';
import { SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR } from '@/config/limits';

const bodySchema = z.object({ url: z.string().url() });

/**
 * step 1 / 8.2 "new link"; the ONE place a merchant-pasted URL
 * turns into a persisted product + link. Onboarding and
 * `/dashboard/links/new` both call this route rather than each reimplementing
 * the scrape-then-link sequence.
 */
export const POST = apiHandler({
  name: 'links.createFromUrl',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  rateLimit: {
    /**
     * `auth: ['merchant_session']` above means resolveAuth has already
     * thrown UNAUTHORIZED by the time this runs if it isn't that variant.
     */
    key: (args) =>
      `scrape:${args.auth.type === 'merchant_session' ? args.auth.merchantId : 'unknown'}`,
    limit: SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR,
    windowSeconds: 3600,
  },
  handler: async ({ body, auth, requestId }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const log = childLogger(requestId, { route: 'links.createFromUrl' });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    const result = await createLinkFromUrl(body.url, merchant.value.merchantId, ctx);
    if (!result.ok) return result;

    return ok(result.value);
  },
});
