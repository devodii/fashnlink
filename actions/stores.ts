import 'server-only';

import { randomBytes } from 'node:crypto';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stores } from '@/db/schema';
import type { Platform, Store } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateStoreInput = Pick<Store, 'domain' | 'platform'> & {
  fingerprint: Record<string, unknown>;
};

function newTrackingToken(): string {
  return randomBytes(24).toString('base64url');
}

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
  merchantId?: string;
  platforms?: Platform[];
  excludePlatforms?: Platform[];
  trackingToken?: string;
  dueForRefreshHours?: number;
}): Promise<Store[]> {
  const conditions = [
    filters.ids?.length ? inArray(stores.id, filters.ids) : undefined,
    filters.domains?.length ? inArray(stores.domain, filters.domains) : undefined,
    filters.merchantId ? eq(stores.merchantId, filters.merchantId) : undefined,
    filters.platforms?.length ? inArray(stores.platform, filters.platforms) : undefined,
    filters.excludePlatforms?.length
      ? notInArray(stores.platform, filters.excludePlatforms)
      : undefined,
    filters.trackingToken ? eq(stores.trackingToken, filters.trackingToken) : undefined,
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
  patch: Partial<Pick<Store, 'lastCrawledAt' | 'merchantId' | 'trackingToken' | 'domain'>>,
): Promise<Store[]> {
  if (ids.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(stores).set(patch).where(inArray(stores.id, ids)).returning();
}

/**
 * Every merchant gets exactly one 'custom' platform store, used purely as
 * the anchor for their tracking script's token and discovered paths (its
 * `domain` is a synthetic placeholder, not a real detected domain, so it is
 * deliberately excluded from the merchant-facing "store domain" display via
 * `excludePlatforms: ['custom']`).
 */
export async function ensureTrackingStore(merchantId: string): Promise<Store> {
  const [existing] = await retrieveStores({ merchantId, platforms: ['custom'] });
  if (existing) return existing;

  const [created] = await db
    .insert(stores)
    .values({
      id: newId('store'),
      merchantId,
      domain: `custom:${merchantId}`,
      platform: 'custom',
      trackingToken: newTrackingToken(),
      fingerprint: {},
    })
    .onConflictDoNothing({ target: stores.domain })
    .returning();
  if (created) return created;

  const [refetched] = await retrieveStores({ merchantId, platforms: ['custom'] });
  if (!refetched) throw new Error('Failed to provision tracking store');
  return refetched;
}
