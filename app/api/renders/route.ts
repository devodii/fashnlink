import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { links, productImages, products } from '@/db/schema';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { err, ok } from '@/lib/result';
import { submitRender } from '@/modules/render/submit';
import { createClaims } from '@/actions/claims';
import { retrieveTwins } from '@/actions/twins';

const bodySchema = z.object({
  linkId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  twinId: z.string().min(1),
  via: z.enum(['poll', 'group']).nullable().optional(),
});

export const POST = apiHandler({
  name: 'renders.create',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, shopper, requestId }) => {
    const { shopperId } = shopper;

    const [[link], [product], [twin]] = await Promise.all([
      db
        .select({
          id: links.id,
          merchantId: links.merchantId,
          status: links.status,
          kind: links.kind,
          productIds: links.productIds,
        })
        .from(links)
        .where(eq(links.id, body.linkId))
        .limit(1),
      db
        .select({
          id: products.id,
          garmentCategory: products.garmentCategory,
          eligibility: products.eligibility,
        })
        .from(products)
        .where(eq(products.id, body.productId))
        .limit(1),
      retrieveTwins({ ids: [body.twinId], shopperIds: [shopperId] }),
    ]);

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

    if (!twin) return err({ code: 'NOT_FOUND', message: 'twin not found' });
    if (twin.status !== 'ready' || !twin.twinUrl) {
      return err({ code: 'INVALID_INPUT', message: 'twin is not ready yet' });
    }

    const log = childLogger(requestId, { route: 'renders.create', shopperId });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    /**
     * fal's providers only accept two `garmentPhotoType` values, 'flat-lay'
     * and 'model'; every enrichment role other than `flat_lay` maps to
     * 'model' as the closest reasonable default.
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

    createClaims([product.id]).catch((cause: unknown) =>
      log.warn({ cause }, 'failed to accrue claim for unowned store'),
    );

    return ok({ renderId: submission.value.renderId, status: 'queued' as const });
  },
});
