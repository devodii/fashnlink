import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { groupMembers, links, renders } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok } from '@/lib/result';

const bodySchema = z.object({
  renderId: z.string().min(1),
  chosenVariantId: z.string().min(1).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
  showInGroup: z.boolean().optional().default(false),
});

/**
 * There's no unique index on `group_members`, so the existing-pick lookup
 * and update below is what prevents a re-submitting shopper from creating a
 * duplicate row; the DB doesn't enforce it.
 */
export const POST = apiHandler({
  name: 'groups.join',
  auth: ['shopper_session'],
  schema: { body: bodySchema, params: z.object({ linkId: z.string() }) },
  handler: async ({ body, params, shopper }) => {
    const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
    if (!link || link.kind !== 'group') {
      return err({ code: 'NOT_FOUND', message: 'group link not found' });
    }

    const [render] = await db.select().from(renders).where(eq(renders.id, body.renderId)).limit(1);
    if (!render || render.linkId !== link.id) {
      return err({ code: 'INVALID_INPUT', message: 'this render does not belong to this group' });
    }

    const existing = await db.select().from(groupMembers).where(eq(groupMembers.linkId, link.id));
    const priorMembership = existing.find((m) => m.shopperId === shopper.shopperId);

    if (priorMembership) {
      const [updated] = await db
        .update(groupMembers)
        .set({
          renderId: body.renderId,
          chosenVariantId: body.chosenVariantId ?? null,
          note: body.note ?? null,
          showInGroup: body.showInGroup,
        })
        .where(eq(groupMembers.id, priorMembership.id))
        .returning();
      return ok({ memberId: updated?.id ?? priorMembership.id });
    }

    const [member] = await db
      .insert(groupMembers)
      .values({
        id: newId('member'),
        linkId: link.id,
        shopperId: shopper.shopperId,
        renderId: body.renderId,
        chosenVariantId: body.chosenVariantId ?? null,
        note: body.note ?? null,
        showInGroup: body.showInGroup,
      })
      .returning();
    if (!member) return err({ code: 'INTERNAL', message: 'failed to join group' });

    return ok({ memberId: member.id });
  },
});
