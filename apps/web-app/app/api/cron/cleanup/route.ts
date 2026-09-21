import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { db } from '@/db';
import { renders, shoppers } from '@tryonlink/shared/schema';
import { deleteObjects } from '@/modules/storage';
import { childLogger } from '@/lib/log';

export const dynamic = 'force-dynamic';

const RENDER_RETENTION_DAYS = 90;

export const GET = apiHandler({
  name: 'cron.cleanup',
  auth: ['cron'],
  handler: async ({ requestId }) => {
    const log = childLogger(requestId, { route: 'cron/cleanup' });
    const cutoff = new Date(Date.now() - RENDER_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const expiredRenders = await db
      .select({ id: renders.id, outputR2Key: renders.outputR2Key })
      .from(renders)
      .innerJoin(shoppers, eq(shoppers.id, renders.shopperId))
      .where(and(isNull(shoppers.email), lt(renders.createdAt, cutoff)));

    if (expiredRenders.length === 0) {
      return ok({ rendersDeleted: 0 });
    }

    const keys = expiredRenders
      .map((render) => render.outputR2Key)
      .filter((key): key is string => !!key);
    const ids = expiredRenders.map((render) => render.id);

    await Promise.all([
      deleteObjects(keys).catch((cause) =>
        log.warn({ cause, count: keys.length }, 'failed to delete orphaned render objects'),
      ),
      db.delete(renders).where(inArray(renders.id, ids)),
    ]);

    return ok({ rendersDeleted: ids.length });
  },
});
