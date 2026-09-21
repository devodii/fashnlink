import { cookies } from 'next/headers';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteShoppers } from '@/actions/shoppers';

export const DELETE = apiHandler({
  name: 'me.deleteAll',
  auth: ['shopper_session'],
  handler: async ({ shopper }) => {
    const [, store] = await Promise.all([deleteShoppers([shopper.shopperId]), cookies()]);
    store.delete('shopper_id');

    return ok({ deleted: true });
  },
});
