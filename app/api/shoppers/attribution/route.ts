import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { renders, shoppers } from '@/db/schema';
import { err, ok } from '@/lib/result';

const bodySchema = z.object({ renderId: z.string().min(1) });

// Section 9.2: "`via` sets shoppers.source_render_id on shopper creation
// only (first touch)." The shopper's cookie is already created by the time
// this fires (shopper_session auth resolves it), so "on creation" here means
// "first call wins" — the `isNull` guard is what makes it a no-op on every
// later visit, section 9.2's actual requirement.
export const POST = apiHandler({
  name: 'shoppers.attribution',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    const [render] = await db
      .select({ id: renders.id })
      .from(renders)
      .where(eq(renders.id, body.renderId))
      .limit(1);
    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

    await db
      .update(shoppers)
      .set({ sourceRenderId: body.renderId })
      .where(and(eq(shoppers.id, shopper.value.shopperId), isNull(shoppers.sourceRenderId)));

    return ok({ recorded: true });
  },
});
