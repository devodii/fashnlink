import { z } from 'zod';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { estimateDrop } from '@/modules/campaigns';
import { ok } from '@/lib/result';

const bodySchema = z.object({ productIds: z.array(z.string().min(1)).min(1).max(3) });

// Live preview for `/dashboard/drops/new` — audience/credit estimate as the
// merchant checks/unchecks products, before they've reserved anything.
export const POST = apiHandler({
  name: 'campaigns.estimate',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const result = await estimateDrop(merchant.value.merchantId, body.productIds);
    if (!result.ok) return result;

    return ok(result.value);
  },
});
