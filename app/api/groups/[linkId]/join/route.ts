import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { groupMembers, links, renders } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok } from '@/lib/result';

const bodySchema = z.object({
  renderId: z.string().min(1),
  chosenVariantId: z.string().min(1).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
});

// Section 9.4: "I'm in: size / color" — one `group_members` row per shopper
// per group link. A shopper re-submitting updates their existing pick rather
// than creating a duplicate row (no unique index on the table, so this is
// enforced here, not by the DB).
export const POST = apiHandler({
  name: 'groups.join',
  auth: ['shopper_session'],
  schema: { body: bodySchema, params: z.object({ linkId: z.string() }) },
  handler: async ({ body, params, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;

    const [link] = await db.select().from(links).where(eq(links.id, params.linkId)).limit(1);
    if (!link || link.kind !== 'group') {
      return err({ code: 'NOT_FOUND', message: 'group link not found' });
    }

    const [render] = await db.select().from(renders).where(eq(renders.id, body.renderId)).limit(1);
    if (!render || render.linkId !== link.id) {
      return err({ code: 'INVALID_INPUT', message: 'this render does not belong to this group' });
    }

    const existing = await db.select().from(groupMembers).where(eq(groupMembers.linkId, link.id));
    const priorMembership = existing.find((m) => m.shopperId === shopper.value.shopperId);

    if (priorMembership) {
      const [updated] = await db
        .update(groupMembers)
        .set({
          renderId: body.renderId,
          chosenVariantId: body.chosenVariantId ?? null,
          note: body.note ?? null,
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
        shopperId: shopper.value.shopperId,
        renderId: body.renderId,
        chosenVariantId: body.chosenVariantId ?? null,
        note: body.note ?? null,
      })
      .returning();
    if (!member) return err({ code: 'INTERNAL', message: 'failed to join group' });

    return ok({ memberId: member.id });
  },
});
