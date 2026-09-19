import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { leads, products } from '@/db/schema';

// `/dashboard/leads` (section 8.2): email, product, first render date,
// renders count, source. `count`/`first render date` are per (merchant,
// email) — a shopper can re-render the same product multiple times before
// or after leaving an email, and `leads` gets one row per (merchant,
// shopper, product) already (schema's unique constraint), so counting here
// is just "how many lead rows share this email," a reasonable proxy for
// engagement without a second join into `renders`.
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
