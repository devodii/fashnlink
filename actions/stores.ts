import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stores } from '@/db/schema';
import { newId } from '@/lib/ids';
import type { PlatformKey } from '@/modules/scraper/types';

export async function createStore(input: {
  domain: string;
  platform: PlatformKey;
  fingerprint: Record<string, unknown>;
}) {
  const existing = await readStore({ domain: input.domain });
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

  return created ?? (await readStore({ domain: input.domain }));
}

export async function readStore(params: { id: string }): Promise<typeof stores.$inferSelect | null>;
export async function readStore(params: {
  domain: string;
}): Promise<typeof stores.$inferSelect | null>;
export async function readStore(params: {
  dueForRefresh: number;
}): Promise<(typeof stores.$inferSelect)[]>;
export async function readStore(params: {
  id?: string;
  domain?: string;
  dueForRefresh?: number;
}): Promise<unknown> {
  if (params.id) {
    const [store] = await db.select().from(stores).where(eq(stores.id, params.id)).limit(1);
    return store ?? null;
  }

  if (params.domain) {
    const [store] = await db.select().from(stores).where(eq(stores.domain, params.domain)).limit(1);
    return store ?? null;
  }

  if (params.dueForRefresh !== undefined) {
    const cutoff = new Date(Date.now() - params.dueForRefresh * 60 * 60 * 1000);
    return db
      .select()
      .from(stores)
      .where(sql`${stores.lastCrawledAt} is null or ${stores.lastCrawledAt} < ${cutoff}`);
  }

  return null;
}

export async function updateStore(id: string, patch: { lastCrawledAt?: Date }) {
  if (patch.lastCrawledAt !== undefined) {
    await db.update(stores).set({ lastCrawledAt: patch.lastCrawledAt }).where(eq(stores.id, id));
  }
}
