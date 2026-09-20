import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { createDrop, estimateDrop } from '@/modules/campaigns';
import { ok } from '@/lib/result';

const bodySchema = z.object({ productIds: z.array(z.string().min(1)).min(1).max(3) });
const querySchema = z.object({ estimate: z.coerce.boolean().default(false) });

export const POST = apiHandler({
  name: 'campaigns.create',
  auth: ['merchant_session'],
  schema: { body: bodySchema, query: querySchema },
  handler: async ({ body, query, merchant }) => {
    const result = query.estimate
      ? await estimateDrop(merchant.merchantId, body.productIds)
      : await createDrop(merchant.merchantId, body.productIds);
    if (!result.ok) return result;

    return ok(result.value);
  },
});
