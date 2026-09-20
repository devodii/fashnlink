import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { updateShoppers } from '@/actions/shoppers';

const bodySchema = z.object({ email: z.email() });

export const POST = apiHandler({
  name: 'shoppers.setEmail',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, shopper }) => {
    await updateShoppers([shopper.shopperId], { email: body.email });

    return ok({ recorded: true });
  },
});
