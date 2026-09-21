import 'server-only';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { claims, products, stores } from '@/db/schema';
import type { Claim, ResolvedClaim } from '@/db/schema';
import { newId } from '@/lib/ids';

export const CLAIM_VISIBLE_THRESHOLD = 3;

export async function createClaims(productIds: string[]): Promise<Claim[]> {
  const results = await Promise.all(
    productIds.map(async (productId) => {
      const [row] = await db
        .select({ storeId: stores.id, merchantId: stores.merchantId })
        .from(products)
        .innerJoin(stores, eq(stores.id, products.storeId))
        .where(eq(products.id, productId))
        .limit(1);
      if (!row || row.merchantId) return undefined;

      const [existing] = await db
        .select()
        .from(claims)
        .where(and(eq(claims.storeId, row.storeId), eq(claims.productId, productId)))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(claims)
          .set({ renderCount: sql`${claims.renderCount} + 1` })
          .where(eq(claims.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(claims)
        .values({ id: newId('claim'), storeId: row.storeId, productId, renderCount: 1 })
        .returning();
      return created;
    }),
  );
  return results.filter((r): r is Claim => Boolean(r));
}

export async function updateClaims(
  storeIds: string[],
  patch: Partial<Pick<Claim, 'claimedByMerchantId' | 'status'>>,
): Promise<Claim[]> {
  if (storeIds.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(claims).set(patch).where(inArray(claims.storeId, storeIds)).returning();
}

export async function retrieveClaims(filters: { storeIds: string[] }): Promise<ResolvedClaim[]> {
  if (filters.storeIds.length === 0) return [];
  const rows = await db
    .select({ claim: claims, productTitle: products.title })
    .from(claims)
    .innerJoin(products, eq(products.id, claims.productId))
    .where(inArray(claims.storeId, filters.storeIds))
    .orderBy(desc(claims.renderCount));
  return rows.map(({ claim, productTitle }) => ({ ...claim, productTitle }));
}
