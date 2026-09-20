import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { links } from '@/db/schema';
import { updateLinks } from '@/actions/links';
import { err, ok } from '@/lib/result';

export const POST = apiHandler({
  name: 'polls.close',
  auth: ['merchant_session'],
  schema: { params: z.object({ linkId: z.string() }) },
  handler: async ({ params, merchant }) => {
    const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
    if (!link || link.kind !== 'poll') return err({ code: 'NOT_FOUND', message: 'poll not found' });
    if (link.merchantId !== merchant.merchantId) {
      return err({ code: 'FORBIDDEN', message: 'not your poll' });
    }

    const [updated] = await updateLinks([link.id], {
      settings: { closedAt: new Date().toISOString(), decidedBy: 'creator' },
    });
    if (!updated) return err({ code: 'INTERNAL', message: 'failed to close poll' });

    return ok({ closed: true });
  },
});
