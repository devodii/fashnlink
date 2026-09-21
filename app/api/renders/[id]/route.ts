import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { deleteObjects } from '@/modules/storage';

const paramsSchema = z.object({ id: z.string() });

const eventBodySchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('share') }),
  z.object({ event: z.literal('buy_click') }),
  z.object({ event: z.literal('visibility'), isPublic: z.boolean() }),
]);

/**
 * Records shopper-driven events against a render: a share, a "Buy" click, or
 * a public-visibility toggle. Each keeps its exact prior validation and side
 * effects, just dispatched from one handler via the `event` discriminator.
 */
export const POST = apiHandler({
  name: 'renders.recordEvent',
  auth: ['shopper_session'],
  schema: { params: paramsSchema, body: eventBodySchema },
  handler: async ({ params, body, shopper }) => {
    if (body.event === 'share') {
      await db
        .update(renders)
        .set({ shareCount: sql`${renders.shareCount} + 1` })
        .where(eq(renders.id, params.id));
      return ok({ recorded: true });
    }

    if (body.event === 'buy_click') {
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
    }

    const updated = await db
      .update(renders)
      .set({ isPublic: body.isPublic })
      .where(and(eq(renders.id, params.id), eq(renders.shopperId, shopper.shopperId)))
      .returning({ id: renders.id });

    if (updated.length === 0) return err({ code: 'NOT_FOUND', message: 'render not found' });
    return ok({ isPublic: body.isPublic });
  },
});

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

    // The DB clear doesn't depend on the (best-effort, errors-swallowed)
    // storage delete finishing first, so run them concurrently.
    const cleanup: Promise<unknown>[] = [
      db
        .update(renders)
        .set({ outputR2Key: null, outputUrl: null })
        .where(eq(renders.id, params.id)),
    ];
    if (render.outputR2Key) {
      cleanup.push(deleteObjects([render.outputR2Key]).catch(() => {}));
    }
    await Promise.all(cleanup);

    return ok({ deleted: true });
  },
});
