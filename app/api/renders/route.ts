import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { links, productImages, products, twins } from '@/db/schema';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { err, ok } from '@/lib/result';
import { submitRender } from '@/modules/render/submit';
import { accrueClaimIfUnowned } from '@/db/repos/claims';

const bodySchema = z.object({
  linkId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  twinId: z.string().min(1),
  /**
   * M6: a render's `via` must match the link's own kind; a 'poll'/'group'
   * render only makes sense against a poll/group link, never a single link
   * (which would let anyone inflate poll_votes/group_members joins against
   * renders that were never really options in that poll/group).
   */
  via: z.enum(['poll', 'group']).nullable().optional(),
});

/**
 * `POST /api/renders`; deducts a credit (M3's credit-ledger
 * transaction) and submits to fal via `submitRender`. `via` defaults to
 * 'direct' (single-link mode, section 8.3); poll/group modes (M6) pass their
 * own `via` explicitly, checked against the link's `kind` below.
 */
export const POST = apiHandler({
  name: 'renders.create',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth, requestId }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;
    const { shopperId } = shopper.value;

    const [link] = await db
      .select({
        id: links.id,
        merchantId: links.merchantId,
        status: links.status,
        kind: links.kind,
        productIds: links.productIds,
      })
      .from(links)
      .where(eq(links.id, body.linkId))
      .limit(1);
    if (!link) return err({ code: 'NOT_FOUND', message: 'link not found' });
    if (link.status !== 'active') {
      return err({ code: 'INVALID_INPUT', message: 'this link is no longer active' });
    }
    if (body.via && body.via !== link.kind) {
      return err({
        code: 'INVALID_INPUT',
        message: `via '${body.via}' does not match this link's kind`,
      });
    }
    if (!link.productIds.includes(body.productId)) {
      return err({ code: 'INVALID_INPUT', message: 'product is not part of this link' });
    }

    const [product] = await db
      .select({
        id: products.id,
        garmentCategory: products.garmentCategory,
        eligibility: products.eligibility,
      })
      .from(products)
      .where(eq(products.id, body.productId))
      .limit(1);
    if (!product) return err({ code: 'NOT_FOUND', message: 'product not found' });
    if (product.eligibility !== 'eligible') {
      return err({ code: 'INVALID_INPUT', message: 'this product is not eligible for try-on' });
    }

    const [tryonImage] = await db
      .select({ url: productImages.url, role: productImages.role })
      .from(productImages)
      .where(and(eq(productImages.productId, product.id), eq(productImages.isTryonSource, true)))
      .limit(1);
    if (!tryonImage) {
      return err({ code: 'INVALID_INPUT', message: 'product has no usable try-on image' });
    }

    const [twin] = await db
      .select({ status: twins.status, twinUrl: twins.twinUrl })
      .from(twins)
      .where(and(eq(twins.id, body.twinId), eq(twins.shopperId, shopperId)))
      .limit(1);
    if (!twin) return err({ code: 'NOT_FOUND', message: 'twin not found' });
    if (twin.status !== 'ready' || !twin.twinUrl) {
      return err({ code: 'INVALID_INPUT', message: 'twin is not ready yet' });
    }

    const log = childLogger(requestId, { route: 'renders.create', shopperId });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    /**
     * DECISION: `role === 'flat_lay'` -> 'flat-lay', everything else (ghost
     * mannequin, on-model, ...) -> 'model'; the two `garmentPhotoType`
     * values fal's providers accept. Not a precise 1:1 mapping
     * of every enrichment role, but the closest reasonable default; refine
     * per-role if a specific provider turns out to need it.
     */
    const garmentPhotoType = tryonImage.role === 'flat_lay' ? 'flat-lay' : 'model';

    const submission = await submitRender(
      {
        merchantId: link.merchantId,
        linkId: link.id,
        productId: product.id,
        variantId: body.variantId ?? null,
        shopperId,
        twinId: body.twinId,
        via: body.via ?? 'direct',
        category: product.garmentCategory,
        twinUrl: twin.twinUrl,
        garmentUrl: tryonImage.url,
        garmentPhotoType,
      },
      ctx,
    );
    if (!submission.ok) return submission;

    /**
     * a no-op unless this product's store has no owning
     * merchant; never blocks the render response on this bookkeeping.
     */
    accrueClaimIfUnowned(product.id).catch((cause) =>
      log.warn({ cause }, 'failed to accrue claim for unowned store'),
    );

    return ok({ renderId: submission.value.renderId, status: 'queued' as const });
  },
});
