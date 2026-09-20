import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { links, pollVotes, renders } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok } from '@/lib/result';

const bodySchema = z.object({ renderId: z.string().min(1) });

/**
 * A repeat vote from the same shopper is treated as idempotent, returning
 * the existing vote, rather than an error.
 */
export const POST = apiHandler({
  name: 'polls.vote',
  auth: ['shopper_session'],
  schema: { body: bodySchema, params: z.object({ linkId: z.string() }) },
  handler: async ({ body, params, shopper }) => {
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
    const priorVote = existing.find((v) => v.voterShopperId === shopper.shopperId);
    if (priorVote) return ok({ voteId: priorVote.id, renderId: priorVote.renderId });

    const [vote] = await db
      .insert(pollVotes)
      .values({
        id: newId('vote'),
        linkId: link.id,
        renderId: body.renderId,
        voterShopperId: shopper.shopperId,
      })
      .returning();
    if (!vote) return err({ code: 'INTERNAL', message: 'failed to record vote' });

    return ok({ voteId: vote.id, renderId: vote.renderId });
  },
});
