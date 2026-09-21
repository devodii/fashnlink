import { cookies } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { products, renders } from '@tryonlink/shared/schema';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteShoppers } from '@/actions/shoppers';

export const GET = apiHandler({
  name: 'me.closet',
  auth: ['shopper_session'],
  handler: async ({ shopper }) => {
    const rows = await db
      .select({
        renderId: renders.id,
        outputUrl: renders.outputUrl,
        productTitle: products.title,
        createdAt: renders.createdAt,
      })
      .from(renders)
      .innerJoin(products, eq(renders.productId, products.id))
      .where(eq(renders.shopperId, shopper.shopperId))
      .orderBy(desc(renders.createdAt));

    return ok({ items: rows });
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
