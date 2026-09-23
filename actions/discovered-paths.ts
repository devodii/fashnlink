import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { discoveredPaths } from '@/db/schema';
import type { DiscoveredPath, DiscoveredPathStatus } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateDiscoveredPathInput = Pick<DiscoveredPath, 'storeId' | 'path' | 'score'> & {
  linkText?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function createDiscoveredPaths(
  inputs: CreateDiscoveredPathInput[],
): Promise<DiscoveredPath[]> {
  const results = await Promise.all(
    inputs.map(async (input) => {
      const [created] = await db
        .insert(discoveredPaths)
        .values({
          id: newId('dpath'),
          storeId: input.storeId,
          path: input.path,
          linkText: input.linkText ?? null,
          score: input.score,
          meta: input.meta ?? null,
        })
        .onConflictDoUpdate({
          target: [discoveredPaths.storeId, discoveredPaths.path],
          set: { lastSeenAt: new Date() },
        })
        .returning();
      return created;
    }),
  );
  return results.filter((r): r is DiscoveredPath => Boolean(r));
}

export async function retrieveDiscoveredPaths(filters: {
  ids?: string[];
  storeIds?: string[];
  paths?: string[];
  statuses?: DiscoveredPathStatus[];
}): Promise<DiscoveredPath[]> {
  const conditions = [
    filters.ids?.length ? inArray(discoveredPaths.id, filters.ids) : undefined,
    filters.storeIds?.length ? inArray(discoveredPaths.storeId, filters.storeIds) : undefined,
    filters.paths?.length ? inArray(discoveredPaths.path, filters.paths) : undefined,
    filters.statuses?.length ? inArray(discoveredPaths.status, filters.statuses) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (conditions.length === 0) return [];
  return db
    .select()
    .from(discoveredPaths)
    .where(and(...conditions));
}

export async function updateDiscoveredPaths(
  ids: string[],
  patch: Partial<Pick<DiscoveredPath, 'status'>>,
): Promise<DiscoveredPath[]> {
  if (ids.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(discoveredPaths).set(patch).where(inArray(discoveredPaths.id, ids)).returning();
}

export async function deleteDiscoveredPaths(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(discoveredPaths).where(inArray(discoveredPaths.id, ids));
}

export async function countDiscoveredPaths(storeId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(discoveredPaths)
    .where(eq(discoveredPaths.storeId, storeId));
  return Number(row?.count ?? 0);
}
