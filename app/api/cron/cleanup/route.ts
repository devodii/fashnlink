import { and, eq, isNull, lt } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { db } from '@/db';
import { renders, shoppers } from '@/db/schema';
import { deleteObject } from '@/modules/storage';
import { childLogger } from '@/lib/log';

export const dynamic = 'force-dynamic';

const RENDER_RETENTION_DAYS = 90;

/**
 * Privacy promise / 8.4: delete renders older than 90 days for
 * shoppers who never saved an email (section 6.7; no closet account means
 * no indefinite retention), purging the UploadThing object each one owns.
 * Campaign image expiry is a no-op here; M7 hasn't built
 * campaigns yet, so the query below naturally returns zero rows rather than
 * needing a special case.
 */
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

    let deleted = 0;
    for (const render of expiredRenders) {
      if (render.outputR2Key) {
        await deleteObject(render.outputR2Key).catch((cause) =>
          log.warn({ cause, renderId: render.id }, 'failed to delete orphaned render object'),
        );
      }
      await db.delete(renders).where(eq(renders.id, render.id));
      deleted++;
    }

    return ok({ rendersDeleted: deleted });
  },
});
