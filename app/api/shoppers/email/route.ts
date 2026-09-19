import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { shoppers } from '@/db/schema';
import { ok } from '@/lib/result';

const bodySchema = z.object({ email: z.email() });

export const POST = apiHandler({
  name: 'shoppers.setEmail',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    await db
      .update(shoppers)
      .set({ email: body.email })
      .where(eq(shoppers.id, shopper.value.shopperId));

    return ok({ recorded: true });
  },
});
