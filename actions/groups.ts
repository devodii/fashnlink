import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { groupMembers, twins } from '@/db/schema';
import type { GroupMember, ResolvedGroupMember } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateGroupMemberInput = Pick<GroupMember, 'linkId' | 'shopperId' | 'renderId'> & {
  chosenVariantId?: string | null;
  note?: string | null;
  showInGroup?: boolean;
};

export async function createGroupMembers(inputs: CreateGroupMemberInput[]): Promise<GroupMember[]> {
  if (inputs.length === 0) return [];
  return db
    .insert(groupMembers)
    .values(
      inputs.map((input) => ({
        id: newId('member'),
        linkId: input.linkId,
        shopperId: input.shopperId,
        renderId: input.renderId,
        chosenVariantId: input.chosenVariantId ?? null,
        note: input.note ?? null,
        showInGroup: input.showInGroup ?? false,
      })),
    )
    .returning();
}

export async function retrieveGroupMembers(filters: {
  linkIds?: string[];
  withTwin?: boolean;
}): Promise<ResolvedGroupMember[]> {
  const conditions = [
    filters.linkIds?.length ? inArray(groupMembers.linkId, filters.linkIds) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return [];

  if (filters.withTwin) {
    const rows = await db
      .select({ member: groupMembers, twinUrl: twins.twinUrl })
      .from(groupMembers)
      .leftJoin(twins, eq(twins.shopperId, groupMembers.shopperId))
      .where(and(...conditions));
    return rows.map(({ member, twinUrl }) => ({ ...member, twinUrl }));
  }

  return db
    .select()
    .from(groupMembers)
    .where(and(...conditions));
}

// Membership has no unique index on (linkId, shopperId); this looks the
// existing row up itself and updates it by id, which is what prevents a
// re-submitting shopper from creating a duplicate row.
export async function updateGroupMembers(
  keys: Pick<GroupMember, 'linkId' | 'shopperId'>[],
  patch: Partial<Pick<GroupMember, 'renderId' | 'chosenVariantId' | 'note' | 'showInGroup'>>,
): Promise<GroupMember[]> {
  if (keys.length === 0) return [];
  const results = await Promise.all(
    keys.map(async ({ linkId, shopperId }) => {
      const [existing] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.linkId, linkId), eq(groupMembers.shopperId, shopperId)))
        .limit(1);
      if (!existing) return undefined;

      const [updated] = await db
        .update(groupMembers)
        .set(patch)
        .where(eq(groupMembers.id, existing.id))
        .returning();
      return updated;
    }),
  );
  return results.filter((r): r is GroupMember => Boolean(r));
}

export async function deleteGroupMembers(ids: string[]): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 };
  const deleted = await db.delete(groupMembers).where(inArray(groupMembers.id, ids)).returning();
  return { deletedCount: deleted.length };
}
