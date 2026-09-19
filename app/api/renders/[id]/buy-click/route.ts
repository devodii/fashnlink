import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

// Section 8.3/9.8: "Buy click sets renders.buy_clicked_at" — read by the
// abandoned-try-on cron (section 9.8, Kind A) to distinguish a try-on that
// led to a buy click from one that didn't. First click only (idempotent).
export const POST = apiHandler({
  name: 'renders.buyClick',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    await db
      .update(renders)
      .set({ buyClickedAt: new Date() })
      .where(
        and(
          eq(renders.id, params.id),
          eq(renders.shopperId, shopper.value.shopperId),
          isNull(renders.buyClickedAt),
        ),
      );

    return ok({ recorded: true });
  },
});
