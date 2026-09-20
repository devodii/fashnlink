import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { deleteObject } from '@/modules/storage';

const paramsSchema = z.object({ id: z.string() });

/**
 * Nulls the image fields rather than deleting the row, tombstoning it; the
 * same treatment `deleteEverythingForShopper` gives every render, just for
 * one at a time.
 */
export const DELETE = apiHandler({
  name: 'renders.delete',
  auth: ['shopper_session'],
  schema: { params: paramsSchema },
  handler: async ({ params, shopper }) => {
    const [render] = await db
      .select({ outputR2Key: renders.outputR2Key })
      .from(renders)
      .where(and(eq(renders.id, params.id), eq(renders.shopperId, shopper.shopperId)))
      .limit(1);
    if (!render) return err({ code: 'NOT_FOUND', message: 'render not found' });

    if (render.outputR2Key) {
      await deleteObject(render.outputR2Key).catch(() => {});
    }
    await db
      .update(renders)
      .set({ outputR2Key: null, outputUrl: null })
      .where(eq(renders.id, params.id));

    return ok({ deleted: true });
  },
});
