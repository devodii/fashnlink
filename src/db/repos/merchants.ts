import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { merchants } from '@/db/schema';

// marketing pricing block shows founding-pass seats remaining.
export async function countFounderMerchants(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(merchants)
    .where(eq(merchants.plan, 'founder'));
  return row?.count ?? 0;
}

export type MerchantSettings = {
  contactChannel?: { type: 'whatsapp' | 'instagram' | 'email'; value: string };
  accentToken?: string;
  logoUrl?: string;
};

export async function findMerchantById(id: string) {
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  return merchant ?? null;
}

export async function updateMerchantSettings(merchantId: string, patch: MerchantSettings) {
  const merchant = await findMerchantById(merchantId);
  if (!merchant) return null;

  const nextSettings = { ...(merchant.settings as MerchantSettings), ...patch };
  const [updated] = await db
    .update(merchants)
    .set({ settings: nextSettings })
    .where(eq(merchants.id, merchantId))
    .returning();
  return updated ?? null;
}

export async function updateMerchantBrand(merchantId: string, name: string) {
  const [updated] = await db
    .update(merchants)
    .set({ name })
    .where(eq(merchants.id, merchantId))
    .returning();
  return updated ?? null;
}
