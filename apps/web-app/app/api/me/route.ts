import { cookies } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { closetResponseSchema } from '@tryonlink/shared';
import { db } from '@/db';
import { links, merchants, products, renders } from '@tryonlink/shared/schema';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteShoppers } from '@/actions/shoppers';
import { retrieveTwins } from '@/actions/twins';

export const GET = apiHandler({
  name: 'me.closet',
  auth: ['shopper_session'],
  handler: async ({ shopper }) => {
    const [rows, [defaultTwin]] = await Promise.all([
      db
        .select({
          renderId: renders.id,
          outputUrl: renders.outputUrl,
          isPublic: renders.isPublic,
          buyUrl: products.buyUrl,
          productTitle: products.title,
          merchantName: merchants.name,
          createdAt: renders.createdAt,
        })
        .from(renders)
        .innerJoin(products, eq(renders.productId, products.id))
        .innerJoin(links, eq(renders.linkId, links.id))
        .innerJoin(merchants, eq(links.merchantId, merchants.id))
        .where(eq(renders.shopperId, shopper.shopperId))
        .orderBy(desc(renders.createdAt)),
      retrieveTwins({ shopperIds: [shopper.shopperId], isDefault: true }),
    ]);

    return ok(
      closetResponseSchema.parse({
        items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        defaultTwin: defaultTwin
          ? { id: defaultTwin.id, status: defaultTwin.status, twinUrl: defaultTwin.twinUrl }
          : null,
      }),
    );
  },
});

export const DELETE = apiHandler({
  name: 'me.deleteAll',
  auth: ['shopper_session'],
  handler: async ({ shopper }) => {
    const [, store] = await Promise.all([deleteShoppers([shopper.shopperId]), cookies()]);
    store.delete('shopper_id');

    return ok({ deleted: true });
  },
});
