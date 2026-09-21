import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { err, ok } from '@/lib/result';
import { SYSTEM_MERCHANT_ID } from '@/system-merchant';
import { retrieveStores, updateStores } from '@/actions/stores';
import { updateClaims } from '@/actions/claims';
import { retrieveProducts } from '@/actions/products';
import { retrieveLinks, updateLinks } from '@/actions/links';

export const POST = apiHandler({
  name: 'claims.claim',
  auth: ['merchant_session'],
  schema: { params: z.object({ storeId: z.string() }) },
  handler: async ({ params, merchant }) => {
    const [store] = await retrieveStores({ ids: [params.storeId] });
    if (!store) return err({ code: 'NOT_FOUND', message: 'store not found' });
    if (store.merchantId)
      return err({ code: 'INVALID_INPUT', message: 'this store is already claimed' });

    // Independent writes to different tables (stores.merchantId vs
    // claims.claimedByMerchantId/status), neither reads the other's result.
    await Promise.all([
      updateStores([store.id], { merchantId: merchant.merchantId }),
      updateClaims([store.id], {
        claimedByMerchantId: merchant.merchantId,
        status: 'claimed',
      }),
    ]);

    // Independent reads: storeProducts keys off `store.id`, demoLinks off the
    // constant SYSTEM_MERCHANT_ID; only the filter below needs both results.
    const [storeProducts, demoLinks] = await Promise.all([
      retrieveProducts({ storeIds: [store.id] }),
      retrieveLinks({ merchantId: SYSTEM_MERCHANT_ID }),
    ]);
    const productIds = storeProducts.map((p) => p.id);
    if (productIds.length > 0) {
      const toReassign = demoLinks
        .filter((l) => l.productIds.some((id) => productIds.includes(id)))
        .map((l) => l.id);
      if (toReassign.length > 0) {
        await updateLinks(toReassign, { merchantId: merchant.merchantId });
      }
    }

    return ok({ claimed: true, storeId: store.id });
  },
});
