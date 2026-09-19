import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

export const POST = apiHandler({
  name: 'renders.share',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    await db
      .update(renders)
      .set({ shareCount: sql`${renders.shareCount} + 1` })
      .where(eq(renders.id, params.id));

    return ok({ recorded: true });
  },
});
