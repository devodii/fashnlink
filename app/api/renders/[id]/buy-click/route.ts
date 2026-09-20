import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

export const POST = apiHandler({
  name: 'renders.buyClick',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, shopper }) => {
    await db
      .update(renders)
      .set({ buyClickedAt: new Date() })
      .where(
        and(
          eq(renders.id, params.id),
          eq(renders.shopperId, shopper.shopperId),
          isNull(renders.buyClickedAt),
        ),
      );

    return ok({ recorded: true });
  },
});
