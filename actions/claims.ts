import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { claims, products, stores } from '@/db/schema';
import { newId } from '@/lib/ids';

export const CLAIM_VISIBLE_THRESHOLD = 3;

export async function createClaim(productId: string): Promise<void> {
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

export async function readClaim(params: { storeId: string; totalOnly: true }): Promise<number>;
export async function readClaim(params: {
  storeId: string;
}): Promise<{ claim: typeof claims.$inferSelect; productTitle: string }[]>;
export async function readClaim(params: {
  storeId: string;
  totalOnly?: boolean;
}): Promise<unknown> {
  const rows = await db
    .select({ claim: claims, productTitle: products.title })
    .from(claims)
    .innerJoin(products, eq(products.id, claims.productId))
    .where(eq(claims.storeId, params.storeId))
    .orderBy(desc(claims.renderCount));

  if (params.totalOnly) return rows.reduce((sum, r) => sum + r.claim.renderCount, 0);
  return rows;
}

// claims table has no update/delete verb used anywhere in the app beyond
// the increment folded into createClaim above, so no updateClaim/deleteClaim.
