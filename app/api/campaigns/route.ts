import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { createDrop } from '@/modules/campaigns';
import { ok } from '@/lib/result';

const bodySchema = z.object({ productIds: z.array(z.string().min(1)).min(1).max(3) });

export const POST = apiHandler({
  name: 'campaigns.create',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, merchant }) => {
    const result = await createDrop(merchant.merchantId, body.productIds);
    if (!result.ok) return result;

    return ok(result.value);
  },
});
