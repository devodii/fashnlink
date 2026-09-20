import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { pollVotes } from '@/db/schema';
import { err, ok } from '@/lib/result';
import { readLink } from '@/actions/links';

export const GET = apiHandler({
  name: 'polls.state',
  auth: ['public'],
  schema: { params: z.object({ linkId: z.string() }) },
  handler: async ({ params }) => {
    const link = await readLink({ id: params.linkId });
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
