import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { groupMembers, links, twins } from '@/db/schema';
import { err, ok } from '@/lib/result';

export const GET = apiHandler({
  name: 'groups.state',
  auth: ['public'],
  schema: { params: z.object({ linkId: z.string() }) },
  handler: async ({ params }) => {
    const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
    if (!link || link.kind !== 'group') {
      return err({ code: 'NOT_FOUND', message: 'group link not found' });
    }

    const members = await db
      .select({
        shopperId: groupMembers.shopperId,
        showInGroup: groupMembers.showInGroup,
        twinUrl: twins.twinUrl,
      })
      .from(groupMembers)
      .leftJoin(twins, eq(twins.shopperId, groupMembers.shopperId))
      .where(eq(groupMembers.linkId, link.id));

    const visibleAvatars = members
      .filter((m) => m.showInGroup && m.twinUrl)
      .map((m) => ({ src: m.twinUrl as string }));

    return ok({
      memberCount: members.length,
      groupName:
        (link.settings as Record<string, unknown>)?.groupName ?? link.title ?? 'Your group',
      avatars: visibleAvatars,
    });
  },
});
