import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { createShopperToken } from '@/actions/shoppers';

export const POST = apiHandler({
  name: 'mobile.session',
  auth: ['public'],
  handler: async () => {
    const { shopperId, token } = await createShopperToken();
    return ok({ shopperId, token });
  },
});
