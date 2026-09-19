import { z } from 'zod';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { createDrop } from '@/modules/campaigns';
import { ok } from '@/lib/result';

const bodySchema = z.object({ productIds: z.array(z.string().min(1)).min(1).max(3) });

/**
 * `/dashboard/drops/new`: "confirm"; reserves credits and fans
 * out campaign_items in one call (see src/modules/campaigns/create.ts).
 */
export const POST = apiHandler({
  name: 'campaigns.create',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const result = await createDrop(merchant.value.merchantId, body.productIds);
    if (!result.ok) return result;

    return ok(result.value);
  },
});
