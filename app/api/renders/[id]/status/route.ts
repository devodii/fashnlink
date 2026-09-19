import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { err, ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

// Section 8.4: `GET /api/renders/[id]/status` — polled while `queued`/`running`.
export const GET = apiHandler({
  name: 'renders.status',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    const [render] = await db
      .select({
        status: renders.status,
        outputUrl: renders.outputUrl,
        watermarked: renders.watermarked,
      })
      .from(renders)
      .where(and(eq(renders.id, params.id), eq(renders.shopperId, shopper.value.shopperId)))
      .limit(1);

    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

    return ok(render);
  },
});
