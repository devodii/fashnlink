import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { merchants, retargetOptins } from '@/db/schema';
import type { RetargetOptin, ResolvedRetargetOptin } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateRetargetOptinInput = Pick<
  RetargetOptin,
  'shopperId' | 'merchantId' | 'email' | 'source'
> & {
  ip?: string | null;
  userAgent?: string | null;
};

export async function createRetargetOptins(
  inputs: CreateRetargetOptinInput[],
): Promise<RetargetOptin[]> {
  if (inputs.length === 0) return [];
  return Promise.all(
    inputs.map(async (input) => {
      const [row] = await db
        .insert(retargetOptins)
        .values({
          id: newId('optin'),
          shopperId: input.shopperId,
          merchantId: input.merchantId,
          email: input.email,
          source: input.source,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        })
        .onConflictDoUpdate({
          target: [retargetOptins.shopperId, retargetOptins.merchantId],
          set: { email: input.email, optedOutAt: null },
        })
        .returning();
      return row;
    }),
  ).then((rows) => rows.filter((r): r is RetargetOptin => Boolean(r)));
}

export async function retrieveRetargetOptins(filters: {
  merchantIds?: string[];
  shopperIds?: string[];
  activeOnly?: boolean;
  withMerchantName?: boolean;
}): Promise<ResolvedRetargetOptin[]> {
  const conditions = [
    filters.merchantIds?.length
      ? inArray(retargetOptins.merchantId, filters.merchantIds)
      : undefined,
    filters.shopperIds?.length ? inArray(retargetOptins.shopperId, filters.shopperIds) : undefined,
    filters.activeOnly ? isNull(retargetOptins.optedOutAt) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return [];

  if (filters.withMerchantName) {
    const rows = await db
      .select({ optin: retargetOptins, merchantName: merchants.name })
      .from(retargetOptins)
      .innerJoin(merchants, eq(retargetOptins.merchantId, merchants.id))
      .where(and(...conditions));
    return rows.map(({ optin, merchantName }) => ({ ...optin, merchantName }));
  }

  return db
    .select()
    .from(retargetOptins)
    .where(and(...conditions));
}

export async function updateRetargetOptins(
  keys: Pick<RetargetOptin, 'shopperId' | 'merchantId'>[],
  patch: Partial<Pick<RetargetOptin, 'optedOutAt'>>,
): Promise<RetargetOptin[]> {
  if (keys.length === 0 || Object.keys(patch).length === 0) return [];
  const results = await Promise.all(
    keys.map(async ({ shopperId, merchantId }) => {
      const [row] = await db
        .update(retargetOptins)
        .set(patch)
        .where(
          and(eq(retargetOptins.shopperId, shopperId), eq(retargetOptins.merchantId, merchantId)),
        )
        .returning();
      return row;
    }),
  );
  return results.filter((r): r is RetargetOptin => Boolean(r));
}

export async function deleteRetargetOptins(filters: {
  merchantIds: string[];
}): Promise<{ deletedCount: number }> {
  if (filters.merchantIds.length === 0) return { deletedCount: 0 };
  const deleted = await db
    .delete(retargetOptins)
    .where(inArray(retargetOptins.merchantId, filters.merchantIds))
    .returning();
  return { deletedCount: deleted.length };
}
