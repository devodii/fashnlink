import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { db } from '@/db';
import {
  cartEvents,
  espConnections,
  links,
  productVariants,
  products,
  renders,
  retargetOptins,
  shoppers,
  twins,
} from '@/db/schema';
import { getSignedUrl } from '@/modules/storage';
import { pushToMerchantEsp } from '@/modules/esp';
import { newId } from '@/lib/ids';
import { childLogger } from '@/lib/log';

export const dynamic = 'force-dynamic';

const ABANDON_AFTER_HOURS = 24;
const CAP_DAYS = 7;
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days (section 9.8)

// Section 9.8 Kind A, "Abandoned Cart Printer". DECISION: `cart_events` isn't
// fed by real storefront cart/checkout webhooks yet (that's explicitly
// Phase 2, section 12 — "Shopify theme app extension + order webhooks").
// `renders.buyClickedAt IS NULL` (already built by M4) is the actual
// tryon-no-buy SIGNAL; this cron's own writes into `cart_events` (kind
// `tryon_no_buy`) are the AUDIT TRAIL of what's already been pushed, and
// double as the per-shopper-per-merchant 7-day dedupe key. One table, one
// job — not two parallel tracking mechanisms.
export const GET = apiHandler({
  name: 'cron.abandoned',
  auth: ['cron'],
  handler: async ({ requestId }) => {
    const log = childLogger(requestId, { route: 'cron/abandoned' });
    const abandonedCutoff = new Date(Date.now() - ABANDON_AFTER_HOURS * 60 * 60 * 1000);
    const capCutoff = new Date(Date.now() - CAP_DAYS * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select({
        renderId: renders.id,
        outputR2Key: renders.outputR2Key,
        outputUrl: renders.outputUrl,
        variantSize: productVariants.optionSize,
        variantColor: productVariants.optionColor,
        productId: products.id,
        productTitle: products.title,
        productUrl: products.url,
        buyUrl: products.buyUrl,
        merchantId: links.merchantId,
        shopperId: shoppers.id,
        shopperEmail: shoppers.email,
      })
      .from(renders)
      .innerJoin(links, eq(renders.linkId, links.id))
      .innerJoin(products, eq(renders.productId, products.id))
      .innerJoin(shoppers, eq(renders.shopperId, shoppers.id))
      .innerJoin(twins, eq(renders.twinId, twins.id))
      .leftJoin(productVariants, eq(renders.variantId, productVariants.id))
      .innerJoin(
        retargetOptins,
        and(
          eq(retargetOptins.shopperId, shoppers.id),
          eq(retargetOptins.merchantId, links.merchantId),
        ),
      )
      .where(
        and(
          isNull(renders.buyClickedAt),
          lt(renders.createdAt, abandonedCutoff),
          eq(renders.status, 'succeeded'),
          isNull(retargetOptins.optedOutAt),
        ),
      );

    let pushed = 0;
    let skippedCapped = 0;
    let skippedNoEsp = 0;

    for (const c of candidates) {
      if (!c.shopperEmail || !c.outputR2Key) continue;

      const [connection] = await db
        .select({ settings: espConnections.settings })
        .from(espConnections)
        .where(eq(espConnections.merchantId, c.merchantId))
        .limit(1);
      const settings = (connection?.settings ?? {}) as { abandonedEnabled?: boolean };
      if (settings.abandonedEnabled === false) {
        skippedNoEsp++;
        continue;
      }

      const [recent] = await db
        .select({ id: cartEvents.id })
        .from(cartEvents)
        .where(
          and(
            eq(cartEvents.merchantId, c.merchantId),
            eq(cartEvents.shopperId, c.shopperId),
            eq(cartEvents.kind, 'tryon_no_buy'),
            gt(cartEvents.occurredAt, capCutoff),
          ),
        )
        .limit(1);
      if (recent) {
        skippedCapped++;
        continue;
      }

      const signedUrl = await getSignedUrl(c.outputR2Key, SIGNED_URL_EXPIRY_SECONDS).catch(
        () => c.outputUrl ?? '',
      );

      const result = await pushToMerchantEsp(
        c.merchantId,
        {
          op: 'event',
          email: c.shopperEmail,
          eventName: 'Tryon Abandoned',
          properties: {
            product_title: c.productTitle,
            product_url: c.productUrl,
            buy_url: c.buyUrl,
            render_image_url: signedUrl,
            render_expires_at: new Date(
              Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000,
            ).toISOString(),
            variant_size: c.variantSize,
            variant_color: c.variantColor,
          },
        },
        { log, requestId, deadlineMs: Date.now() + 30_000, fetch: globalThis.fetch },
      );

      if (!result.ok) {
        if (result.error.code === 'NOT_FOUND') skippedNoEsp++;
        else log.warn({ cause: result.error, renderId: c.renderId }, 'abandoned esp push failed');
        continue;
      }

      await db.insert(cartEvents).values({
        id: newId('cart'),
        merchantId: c.merchantId,
        shopperId: c.shopperId,
        productId: c.productId,
        renderId: c.renderId,
        kind: 'tryon_no_buy',
      });
      pushed++;
    }

    return ok({ pushed, skippedCapped, skippedNoEsp, candidates: candidates.length });
  },
});
