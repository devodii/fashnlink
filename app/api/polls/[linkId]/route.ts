import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { links, pollVotes, renders } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { retrieveLinks, updateLinks } from '@/actions/links';
import { createShoppers } from '@/actions/shoppers';
import { newId } from '@/lib/ids';

const paramsSchema = z.object({ linkId: z.string() });

export const GET = apiHandler({
  name: 'polls.state',
  auth: ['public'],
  schema: { params: paramsSchema },
  handler: async ({ params }) => {
    const [link] = await retrieveLinks({ ids: [params.linkId] });
    if (!link || link.kind !== 'poll') return err({ code: 'NOT_FOUND', message: 'poll not found' });

    const votes = await db.select().from(pollVotes).where(eq(pollVotes.linkId, link.id));
    const counts: Record<string, number> = {};
    for (const vote of votes) counts[vote.renderId] = (counts[vote.renderId] ?? 0) + 1;

    return ok({
      closed: link.isClosed ?? false,
      votesByRenderId: counts,
      totalVotes: votes.length,
    });
  },
});

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('vote'), renderId: z.string().min(1) }),
  z.object({ action: z.literal('close') }),
]);

/**
 * `vote` (shopper) and `close` (merchant, poll owner) have mutually
 * exclusive auth requirements, so `auth` here only widens which scopes are
 * *attempted* (merchant session first, falling back to the always-succeeding
 * shopper session); each branch below still enforces its own exact original
 * requirement rather than trusting the resolved scope.
 */
export const POST = apiHandler({
  name: 'polls.action',
  auth: ['merchant_session', 'shopper_session'],
  schema: { body: bodySchema, params: paramsSchema },
  handler: async ({ body, params, auth }) => {
    if (body.action === 'close') {
      if (auth.type !== 'merchant_session') {
        return err({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
      }

      const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
      if (!link || link.kind !== 'poll') {
        return err({ code: 'NOT_FOUND', message: 'poll not found' });
      }
      if (link.merchantId !== auth.merchantId) {
        return err({ code: 'FORBIDDEN', message: 'not your poll' });
      }

      const [updated] = await updateLinks([link.id], {
        settings: { closedAt: new Date().toISOString(), decidedBy: 'creator' },
      });
      if (!updated) return err({ code: 'INTERNAL', message: 'failed to close poll' });

      return ok({ closed: true });
    }

    // `vote` is shopper-only, and always resolves a shopper identity off the
    // cookie regardless of which scope the request happened to auth as
    // (matching the original standalone route's `auth: ['shopper_session']`).
    const shopperId = await createShoppers();

    const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
    if (!link || link.kind !== 'poll') return err({ code: 'NOT_FOUND', message: 'poll not found' });

    const [render] = await db.select().from(renders).where(eq(renders.id, body.renderId)).limit(1);
    if (!render || render.linkId !== link.id) {
      return err({ code: 'INVALID_INPUT', message: 'this render is not an option in this poll' });
    }

    const existing = await db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.linkId, link.id))
      .limit(200); // small polls only, no pagination needed
    const priorVote = existing.find((v) => v.voterShopperId === shopperId);
    if (priorVote) return ok({ voteId: priorVote.id, renderId: priorVote.renderId });

    const [vote] = await db
      .insert(pollVotes)
      .values({
        id: newId('vote'),
        linkId: link.id,
        renderId: body.renderId,
        voterShopperId: shopperId,
      })
      .returning();
    if (!vote) return err({ code: 'INTERNAL', message: 'failed to record vote' });

    return ok({ voteId: vote.id, renderId: vote.renderId });
  },
});
