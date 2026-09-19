import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { deleteMerchantAccount } from '@/modules/auth/delete-account';

// Section 8.2 "delete account" — see src/modules/auth/delete-account.ts for
// exactly what this does and doesn't cascade into.
export const POST = apiHandler({
  name: 'merchants.deleteAccount',
  auth: ['merchant_session'],
  handler: async ({ auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    await deleteMerchantAccount(merchant.value.merchantId, merchant.value.email);
    return ok({ deleted: true });
  },
});
