import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { claims, links, products, stores } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { SYSTEM_MERCHANT_ID } from '@/system-merchant';

export const POST = apiHandler({
  name: 'claims.claim',
  auth: ['merchant_session'],
  schema: { params: z.object({ storeId: z.string() }) },
  handler: async ({ params, merchant }) => {
    const [store] = await db.select().from(stores).where(eq(stores.id, params.storeId)).limit(1);
    if (!store) return err({ code: 'NOT_FOUND', message: 'store not found' });
    if (store.merchantId)
      return err({ code: 'INVALID_INPUT', message: 'this store is already claimed' });

    await db.update(stores).set({ merchantId: merchant.merchantId }).where(eq(stores.id, store.id));

    await db
      .update(claims)
      .set({ claimedByMerchantId: merchant.merchantId, status: 'claimed' })
      .where(eq(claims.storeId, store.id));

    const storeProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.storeId, store.id));
    const productIds = storeProducts.map((p) => p.id);
    if (productIds.length > 0) {
      const demoLinks = await db
        .select({ id: links.id, productIds: links.productIds })
        .from(links)
        .where(eq(links.merchantId, SYSTEM_MERCHANT_ID));
      const toReassign = demoLinks
        .filter((l) => l.productIds.some((id) => productIds.includes(id)))
        .map((l) => l.id);
      if (toReassign.length > 0) {
        await db
          .update(links)
          .set({ merchantId: merchant.merchantId })
          .where(inArray(links.id, toReassign));
      }
    }

    return ok({ claimed: true, storeId: store.id });
  },
});
