import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders, shoppers } from '@/db/schema';
import { err, ok } from '@/lib/result';

const bodySchema = z.object({ renderId: z.string().min(1) });

export const POST = apiHandler({
  name: 'shoppers.attribution',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, shopper }) => {
    const [render] = await db
      .select({ id: renders.id })
      .from(renders)
      .where(eq(renders.id, body.renderId))
      .limit(1);
    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

    await db
      .update(shoppers)
      .set({ sourceRenderId: body.renderId })
      .where(and(eq(shoppers.id, shopper.shopperId), isNull(shoppers.sourceRenderId)));

    return ok({ recorded: true });
  },
});
