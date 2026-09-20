import { and, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stores } from '@/db/schema';
import type { Store } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateStoreInput = Pick<Store, 'domain' | 'platform'> & {
  fingerprint: Record<string, unknown>;
};

export async function createStores(inputs: CreateStoreInput[]): Promise<Store[]> {
  const results = await Promise.all(
    inputs.map(async (input) => {
      const [existing] = await retrieveStores({ domains: [input.domain] });
      if (existing) return existing;

      const [created] = await db
        .insert(stores)
        .values({
          id: newId('store'),
          domain: input.domain,
          platform: input.platform,
          fingerprint: input.fingerprint,
        })
        .onConflictDoNothing({ target: stores.domain })
        .returning();
      if (created) return created;

      const [refetched] = await retrieveStores({ domains: [input.domain] });
      return refetched;
    }),
  );
  return results.filter((r): r is Store => Boolean(r));
}

export async function retrieveStores(filters: {
  ids?: string[];
  domains?: string[];
  dueForRefreshHours?: number;
}): Promise<Store[]> {
  const conditions = [
    filters.ids?.length ? inArray(stores.id, filters.ids) : undefined,
    filters.domains?.length ? inArray(stores.domain, filters.domains) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (filters.dueForRefreshHours !== undefined) {
    const cutoff = new Date(Date.now() - filters.dueForRefreshHours * 60 * 60 * 1000);
    conditions.push(sql`${stores.lastCrawledAt} is null or ${stores.lastCrawledAt} < ${cutoff}`);
  }

  if (conditions.length === 0) return [];
  return db
    .select()
    .from(stores)
    .where(and(...conditions));
}

export async function updateStores(
  ids: string[],
  patch: Partial<Pick<Store, 'lastCrawledAt'>>,
): Promise<Store[]> {
  if (ids.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(stores).set(patch).where(inArray(stores.id, ids)).returning();
}
