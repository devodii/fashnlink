import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteMerchants } from '@/actions/merchants';

export const POST = apiHandler({
  name: 'merchants.deleteAccount',
  auth: ['merchant_session'],
  handler: async ({ merchant }) => {
    await deleteMerchants([merchant.merchantId]);
    return ok({ deleted: true });
  },
});
