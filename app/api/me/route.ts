import { cookies } from 'next/headers';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteEverythingForShopper } from '@/modules/shoppers';

// Section 7.4/8.4: `DELETE /api/me` — "delete everything" from `/me`. Real
// deletes from UploadThing + DB (see deleteEverythingForShopper), then clears
// the cookie itself so a reload starts the shopper completely fresh rather
// than resolving back to the now-erased id.
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
