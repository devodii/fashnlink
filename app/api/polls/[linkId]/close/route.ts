import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { db } from '@/db';
import { links } from '@/db/schema';
import { closePoll } from '@/db/repos/links';
import { err, ok } from '@/lib/result';

// Section 9.3: "Poll closes ... when the creator taps 'decide'." The
// merchant who owns the link is the one who can force-close it early — a
// shopper-created poll (`settings.createdByShopper`) still belongs to the
// merchant's link row, so this stays merchant-session gated, not opened up
// to arbitrary shoppers.
export const POST = apiHandler({
  name: 'polls.close',
  auth: ['merchant_session'],
  schema: { params: z.object({ linkId: z.string() }) },
  handler: async ({ params, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
    if (!link || link.kind !== 'poll') return err({ code: 'NOT_FOUND', message: 'poll not found' });
    if (link.merchantId !== merchant.value.merchantId) {
      return err({ code: 'FORBIDDEN', message: 'not your poll' });
    }

    const updated = await closePoll(link.id, 'creator');
    if (!updated) return err({ code: 'INTERNAL', message: 'failed to close poll' });

    return ok({ closed: true });
  },
});
