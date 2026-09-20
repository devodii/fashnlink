import { cookies } from 'next/headers';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteShoppers } from '@/actions/shoppers';

export const DELETE = apiHandler({
  name: 'me.deleteAll',
  auth: ['shopper_session'],
  handler: async ({ shopper }) => {
    await deleteShoppers([shopper.shopperId]);

    const store = await cookies();
    store.delete('shopper_id');

    return ok({ deleted: true });
  },
});
