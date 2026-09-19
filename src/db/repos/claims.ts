import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { claims, products, stores } from '@/db/schema';
import { newId } from '@/lib/ids';

// Section 9.6: "renders accrue to a claims row" for a product whose store
// has no owning merchant yet. Called after every successful render
// submission (`submitRender`) — a no-op for any normally-owned store.
export async function accrueClaimIfUnowned(productId: string): Promise<void> {
  const [row] = await db
    .select({ storeId: stores.id, merchantId: stores.merchantId })
    .from(products)
    .innerJoin(stores, eq(stores.id, products.storeId))
    .where(eq(products.id, productId))
    .limit(1);
  if (!row || row.merchantId) return;

  const [existing] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.storeId, row.storeId), eq(claims.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(claims)
      .set({ renderCount: sql`${claims.renderCount} + 1` })
      .where(eq(claims.id, existing.id));
    return;
  }

  await db.insert(claims).values({
    id: newId('claim'),
    storeId: row.storeId,
    productId,
    renderCount: 1,
  });
}

const CLAIM_VISIBLE_THRESHOLD = 3;

export async function findClaimsForStore(storeId: string) {
  const rows = await db
    .select({ claim: claims, productTitle: products.title })
    .from(claims)
    .innerJoin(products, eq(products.id, claims.productId))
    .where(eq(claims.storeId, storeId))
    .orderBy(desc(claims.renderCount));
  return rows;
}

export async function totalClaimRenderCount(storeId: string): Promise<number> {
  const rows = await findClaimsForStore(storeId);
  return rows.reduce((sum, r) => sum + r.claim.renderCount, 0);
}

export { CLAIM_VISIBLE_THRESHOLD };
