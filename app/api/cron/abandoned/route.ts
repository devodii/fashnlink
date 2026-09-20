import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
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
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * `cart_events` isn't fed by real storefront cart/checkout webhooks;
 * `renders.buyClickedAt IS NULL` is the actual tryon-no-buy signal, and this
 * cron's own writes into `cart_events` (kind `tryon_no_buy`) are the audit
 * trail of what's already been pushed, doubling as the per-shopper-per-
 * merchant 7-day dedupe key.
 */
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
      const shopperEmail = c.shopperEmail;
      const outputR2Key = c.outputR2Key;

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

      const signedUrl = await getSignedUrl(outputR2Key, SIGNED_URL_EXPIRY_SECONDS).catch(
        () => c.outputUrl ?? '',
      );

      /**
       * The dedupe check, the ESP push, and the audit-trail insert all run
       * inside one transaction serialized per (merchant, shopper) with an
       * advisory lock, otherwise two overlapping cron invocations (the
       * previous run taking longer than the schedule interval) could both
       * pass the "not recently pushed" check before either inserts, sending
       * the same shopper a duplicate abandoned-cart nudge.
       */
      const pushResult = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${c.merchantId} || ':' || ${c.shopperId}))`,
        );

        const [recent] = await tx
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
        if (recent) return { outcome: 'capped' as const };

        const result = await pushToMerchantEsp(
          c.merchantId,
          {
            op: 'event',
            email: shopperEmail,
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
        if (!result.ok) return { outcome: 'failed' as const, error: result.error };

        await tx.insert(cartEvents).values({
          id: newId('cart'),
          merchantId: c.merchantId,
          shopperId: c.shopperId,
          productId: c.productId,
          renderId: c.renderId,
          kind: 'tryon_no_buy',
        });
        return { outcome: 'pushed' as const };
      });

      if (pushResult.outcome === 'capped') {
        skippedCapped++;
        continue;
      }
      if (pushResult.outcome === 'failed') {
        if (pushResult.error.code === 'NOT_FOUND') skippedNoEsp++;
        else
          log.warn({ cause: pushResult.error, renderId: c.renderId }, 'abandoned esp push failed');
        continue;
      }
      pushed++;
    }

    return ok({ pushed, skippedCapped, skippedNoEsp, candidates: candidates.length });
  },
});
