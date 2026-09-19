import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { err, ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });
const bodySchema = z.object({ isPublic: z.boolean() });

export const POST = apiHandler({
  name: 'renders.setVisibility',
  auth: ['shopper_session'],
  schema: { params: paramsSchema, body: bodySchema },
  handler: async ({ params, body, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    const updated = await db
      .update(renders)
      .set({ isPublic: body.isPublic })
      .where(and(eq(renders.id, params.id), eq(renders.shopperId, shopper.value.shopperId)))
      .returning({ id: renders.id });

    if (updated.length === 0) return err({ code: 'NOT_FOUND', message: 'render not found' });
    return ok({ isPublic: body.isPublic });
  },
});
