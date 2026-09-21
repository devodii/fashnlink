import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { err, ok } from '@/lib/result';
import { retrieveLinks } from '@/actions/links';
import { retrieveRenders } from '@/actions/renders';
import { createGroupMembers, retrieveGroupMembers, updateGroupMembers } from '@/actions/groups';

const paramsSchema = z.object({ linkId: z.string() });

export const GET = apiHandler({
  name: 'groups.state',
  auth: ['public'],
  schema: { params: paramsSchema },
  handler: async ({ params }) => {
    const [link] = await retrieveLinks({ ids: [params.linkId] });
    if (!link || link.kind !== 'group') {
      return err({ code: 'NOT_FOUND', message: 'group link not found' });
    }

    const members = await retrieveGroupMembers({ linkIds: [link.id], withTwin: true });

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

const joinBodySchema = z.object({
  renderId: z.string().min(1),
  chosenVariantId: z.string().min(1).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
  showInGroup: z.boolean().optional().default(false),
});

export const POST = apiHandler({
  name: 'groups.join',
  auth: ['shopper_session'],
  schema: { body: joinBodySchema, params: paramsSchema },
  handler: async ({ body, params, shopper }) => {
    // Independent lookups: `link` keys off params.linkId, `render` off
    // body.renderId; only the checks below need both results together.
    const [[link], [render]] = await Promise.all([
      retrieveLinks({ ids: [params.linkId] }),
      retrieveRenders({ ids: [body.renderId] }),
    ]);
    if (!link || link.kind !== 'group') {
      return err({ code: 'NOT_FOUND', message: 'group link not found' });
    }
    if (!render || render.linkId !== link.id) {
      return err({ code: 'INVALID_INPUT', message: 'this render does not belong to this group' });
    }

    const patch = {
      renderId: body.renderId,
      chosenVariantId: body.chosenVariantId ?? null,
      note: body.note ?? null,
      showInGroup: body.showInGroup,
    };

    const [updated] = await updateGroupMembers(
      [{ linkId: link.id, shopperId: shopper.shopperId }],
      patch,
    );
    if (updated) return ok({ memberId: updated.id });

    const [member] = await createGroupMembers([
      { linkId: link.id, shopperId: shopper.shopperId, ...patch },
    ]);
    if (!member) return err({ code: 'INTERNAL', message: 'failed to join group' });

    return ok({ memberId: member.id });
  },
});
