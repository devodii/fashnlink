import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { createPlatformRequest } from '@/actions/platform-requests';

const bodySchema = z.object({ notes: z.string().min(1).max(500) });

export const POST = apiHandler({
  name: 'platformRequests.createFreeText',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, merchant }) => {
    await createPlatformRequest({
      kind: 'freetext',
      merchantId: merchant.merchantId,
      notes: body.notes,
    });
    return ok({ recorded: true });
  },
});
