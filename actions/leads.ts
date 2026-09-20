import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { leads, products, renders } from '@/db/schema';

export async function readLead(params: { linkId: string; countOnly: true }): Promise<number>;
export async function readLead(params: {
  merchantId: string;
}): Promise<
  { email: string; productTitle: string; source: string; createdAt: Date; count: number }[]
>;
export async function readLead(params: {
  merchantId?: string;
  linkId?: string;
  countOnly?: boolean;
}): Promise<unknown> {
  if (params.linkId && params.countOnly) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .innerJoin(renders, eq(renders.id, leads.renderId))
      .where(eq(renders.linkId, params.linkId));
    return row?.count ?? 0;
  }

  if (params.merchantId) {
    // `count` is how many lead rows share this email, a proxy for
    // engagement, not an exact count of renders.
    const rows = await db
      .select({
        email: leads.email,
        productTitle: products.title,
        source: leads.source,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(products, eq(products.id, leads.productId))
      .where(eq(leads.merchantId, params.merchantId))
      .orderBy(desc(leads.createdAt));

    const countByEmail = new Map<string, number>();
    for (const row of rows) countByEmail.set(row.email, (countByEmail.get(row.email) ?? 0) + 1);

    return rows.map((row) => ({ ...row, count: countByEmail.get(row.email) ?? 1 }));
  }

  return null;
}
