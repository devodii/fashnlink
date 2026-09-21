import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@tryonlink/shared/schema';
import { err, ok } from '@/lib/result';

const paramsSchema = z.object({ id: z.string() });

export const GET = apiHandler({
  name: 'renders.status',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, shopper }) => {
    const [render] = await db
      .select({
        status: renders.status,
        outputUrl: renders.outputUrl,
        watermarked: renders.watermarked,
      })
      .from(renders)
      .where(and(eq(renders.id, params.id), eq(renders.shopperId, shopper.shopperId)))
      .limit(1);

    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

    return ok(render);
  },
});
