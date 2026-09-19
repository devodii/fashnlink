import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stores } from '@/db/schema';
import { newId } from '@/lib/ids';
import type { PlatformKey } from '@/modules/scraper/types';

export async function findStoreByDomain(domain: string) {
  const [store] = await db.select().from(stores).where(eq(stores.domain, domain)).limit(1);
  return store ?? null;
}

export async function findStoreById(id: string) {
  const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return store ?? null;
}

// Section 8.4's `refresh-catalogs` cron: stores whose adapter can list a
// catalog, not crawled in the last `staleAfterHours` (or never).
export async function findStoresDueForRefresh(staleAfterHours: number) {
  const cutoff = new Date(Date.now() - staleAfterHours * 60 * 60 * 1000);
  return db
    .select()
    .from(stores)
    .where(sql`${stores.lastCrawledAt} is null or ${stores.lastCrawledAt} < ${cutoff}`);
}

export async function findOrCreateStore(input: {
  domain: string;
  platform: PlatformKey;
  fingerprint: Record<string, unknown>;
}) {
  const existing = await findStoreByDomain(input.domain);
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

  return created ?? (await findStoreByDomain(input.domain));
}

export async function touchStoreCrawled(storeId: string) {
  await db.update(stores).set({ lastCrawledAt: new Date() }).where(eq(stores.id, storeId));
}
