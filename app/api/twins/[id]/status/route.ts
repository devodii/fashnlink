import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { twins } from '@/db/schema';
import { err, ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

/**
 * `GET /api/twins/[id]/status`; polled by the client
 * (usePolling, section 10.4) while a twin is `pending`. Scoped to the
 * requesting shopper's own twin; a status id is guessable (ULID, not a
 * secret), so ownership is checked, not just existence.
 */
export const GET = apiHandler({
  name: 'twins.status',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    const [twin] = await db
      .select({ status: twins.status, twinUrl: twins.twinUrl, isDefault: twins.isDefault })
      .from(twins)
      .where(and(eq(twins.id, params.id), eq(twins.shopperId, shopper.value.shopperId)))
      .limit(1);

    if (!twin) return err({ code: 'NOT_FOUND', message: 'twin not found' });

    return ok(twin);
  },
});
