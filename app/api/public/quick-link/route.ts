import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { err, ok } from '@/lib/result';
import { scrapeUrlToProduct } from '@/modules/links/create-link-from-url';
import { createSingleLink, findProductImagesForLink } from '@/db/repos/links';
import { ensureSystemMerchant, SYSTEM_MERCHANT_ID } from '@/config/system-merchant';
import { QUICK_LINK_DEMO_PER_IP_PER_DAY } from '@/config/limits';

const bodySchema = z.object({ url: z.string().url() });

export const POST = apiHandler({
  name: 'public.quickLink',
  auth: ['public'],
  cors: true,
  schema: { body: bodySchema },
  rateLimit: {
    key: (args) => {
      const ip = args.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      return `quick-link:${ip}`;
    },
    limit: QUICK_LINK_DEMO_PER_IP_PER_DAY,
    windowSeconds: 24 * 60 * 60,
  },
  /**
   * A hostname alone can't tell us the platform before scraping, so
   * `scrapeUrlToProduct` routes through `ScraperRegistry` and fails cleanly
   * (UNSUPPORTED_PLATFORM/SCRAPE_FAILED) for anything unsupported, rather
   * than this route hand-listing allowed hostnames.
   */
  handler: async ({ body, requestId }) => {
    await ensureSystemMerchant();

    const log = childLogger(requestId, { route: 'public.quickLink' });
    const ctx = { log, requestId, deadlineMs: Date.now() + 30_000, fetch: createFetch({ log }) };

    const scraped = await scrapeUrlToProduct(body.url, SYSTEM_MERCHANT_ID, ctx);
    if (!scraped.ok) return scraped;

    const link = await createSingleLink({
      merchantId: SYSTEM_MERCHANT_ID,
      productId: scraped.value.productId,
    });
    if (!link) return err({ code: 'INTERNAL', message: 'Failed to create demo link' });

    const images = await findProductImagesForLink(scraped.value.productId);
    const tryonImage = images.find((i) => i.isTryonSource) ?? images[0] ?? null;

    return ok({
      slug: link.slug,
      productTitle: scraped.value.productTitle,
      imageUrl: tryonImage?.url ?? null,
    });
  },
});
