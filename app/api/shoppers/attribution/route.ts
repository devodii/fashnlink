import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { shoppers } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { retrieveRenders } from '@/actions/renders';

const bodySchema = z.object({ renderId: z.string().min(1) });

export const POST = apiHandler({
  name: 'shoppers.attribution',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, shopper }) => {
    const [render] = await retrieveRenders({ ids: [body.renderId] });
    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

    await db
      .update(shoppers)
      .set({ sourceRenderId: body.renderId })
      .where(and(eq(shoppers.id, shopper.shopperId), isNull(shoppers.sourceRenderId)));

    return ok({ recorded: true });
  },
});
