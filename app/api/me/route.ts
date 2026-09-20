import { cookies } from 'next/headers';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteEverythingForShopper } from '@/modules/shoppers';

export const DELETE = apiHandler({
  name: 'me.deleteAll',
  auth: ['shopper_session'],
  handler: async ({ shopper }) => {
    await deleteEverythingForShopper(shopper.shopperId);

    const store = await cookies();
    store.delete('shopper_id');

    return ok({ deleted: true });
  },
});
