import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { pollDetailResponseSchema } from '@tryonlink/shared';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@tryonlink/shared/schema';
import { err, ok } from '@/lib/result';
import { retrieveLinks } from '@/actions/links';
import { retrieveTwins } from '@/actions/twins';
import { retrieveMerchants } from '@/actions/merchants';
import { retrieveProducts } from '@/actions/products';

const paramsSchema = z.object({ slug: z.string() });
const querySchema = z.object({ creatorShopperId: z.string().optional() });

/**
 * Thin mobile counterpart to app/(shopper)/p/[slug]/page.tsx's data-loading
 * for poll voting: same actions, same "latest succeeded render per product
 * for the poll creator" resolution, no new business logic.
 */
export const GET = apiHandler({
  name: 'public.pollDetail',
  auth: ['shopper_session'],
  schema: { params: paramsSchema, query: querySchema },
  handler: async ({ params, query, shopper }) => {
    const [link] = await retrieveLinks({ slugs: [params.slug] });
    if (!link || link.kind !== 'poll' || link.status === 'archived') {
      return err({ code: 'NOT_FOUND', message: 'poll not found' });
    }

    const [[merchant], pollProducts, creatorRenders, [defaultTwin]] = await Promise.all([
      retrieveMerchants({ ids: [link.merchantId] }),
      retrieveProducts({ ids: link.productIds }),
      query.creatorShopperId
        ? db
            .select()
            .from(renders)
            .where(
              and(
                eq(renders.linkId, link.id),
                eq(renders.shopperId, query.creatorShopperId),
                eq(renders.status, 'succeeded'),
              ),
            )
            .orderBy(desc(renders.createdAt))
        : Promise.resolve([]),
      retrieveTwins({ shopperIds: [shopper.shopperId], isDefault: true }),
    ]);

    const renderByProduct = new Map<string, (typeof creatorRenders)[number]>();
    for (const r of creatorRenders) {
      if (!renderByProduct.has(r.productId)) renderByProduct.set(r.productId, r);
    }

    const options = link.productIds
      .map((id) => {
        const product = pollProducts.find((p) => p.id === id);
        const render = renderByProduct.get(id);
        if (!product || !render || !render.outputUrl) return null;
        return {
          productId: id,
          productTitle: product.title,
          renderId: render.id,
          imageUrl: render.outputUrl,
        };
      })
      .filter((o): o is NonNullable<typeof o> => !!o);

    return ok(
      pollDetailResponseSchema.parse({
        linkId: link.id,
        merchantName: merchant?.name ?? 'This shop',
        options,
        closed: link.isClosed ?? false,
        defaultTwin: defaultTwin
          ? { id: defaultTwin.id, status: defaultTwin.status, twinUrl: defaultTwin.twinUrl }
          : null,
      }),
    );
  },
});
