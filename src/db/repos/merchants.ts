import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { merchants } from '@/db/schema';

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
