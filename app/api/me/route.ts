import { cookies } from 'next/headers';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteEverythingForShopper } from '@/modules/shoppers';

export const DELETE = apiHandler({
  name: 'me.deleteAll',
  auth: ['shopper_session'],
  handler: async ({ auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    await deleteEverythingForShopper(shopper.value.shopperId);

    const store = await cookies();
    store.delete('shopper_id');

    return ok({ deleted: true });
  },
});
