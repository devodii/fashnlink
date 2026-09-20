import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteMerchantAccount } from '@/modules/auth/delete-account';

export const POST = apiHandler({
  name: 'merchants.deleteAccount',
  auth: ['merchant_session'],
  handler: async ({ merchant }) => {
    await deleteMerchantAccount(merchant.merchantId, merchant.email);
    return ok({ deleted: true });
  },
});
