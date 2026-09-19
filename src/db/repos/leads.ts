import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { leads, products } from '@/db/schema';

// `count` is how many lead rows share this email, a proxy for engagement,
// not an exact count of renders.
export async function findLeadsForMerchant(merchantId: string) {
  const rows = await db
    .select({
      email: leads.email,
      productTitle: products.title,
      source: leads.source,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(products, eq(products.id, leads.productId))
    .where(eq(leads.merchantId, merchantId))
    .orderBy(desc(leads.createdAt));

  const countByEmail = new Map<string, number>();
  for (const row of rows) countByEmail.set(row.email, (countByEmail.get(row.email) ?? 0) + 1);

  return rows.map((row) => ({ ...row, count: countByEmail.get(row.email) ?? 1 }));
}
