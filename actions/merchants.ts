import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { merchants } from '@/db/schema';
import type { Merchant, Plan } from '@/db/schema';
import type { ContactChannel } from '@/config/contact-channel';

export type MerchantSettings = {
  contactChannel?: ContactChannel;
  accentToken?: string;
  logoUrl?: string;
};

export async function retrieveMerchants(filters: {
  ids?: string[];
  plan?: Plan;
}): Promise<Merchant[]> {
  const conditions = [
    filters.ids?.length ? inArray(merchants.id, filters.ids) : undefined,
    filters.plan ? eq(merchants.plan, filters.plan) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return [];
  return db
    .select()
    .from(merchants)
    .where(and(...conditions));
}

export async function updateMerchants(
  ids: string[],
  patch: Partial<Pick<Merchant, 'name'>> & { settings?: Partial<MerchantSettings> },
): Promise<Merchant[]> {
  if (ids.length === 0) return [];

  if (patch.settings !== undefined) {
    const existingRows = await db.select().from(merchants).where(inArray(merchants.id, ids));
    const updated = await Promise.all(
      existingRows.map(async (row) => {
        const [result] = await db
          .update(merchants)
          .set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            settings: { ...(row.settings as MerchantSettings), ...patch.settings },
          })
          .where(eq(merchants.id, row.id))
          .returning();
        return result;
      }),
    );
    return updated.filter((r): r is Merchant => Boolean(r));
  }

  if (patch.name === undefined) return [];
  return db
    .update(merchants)
    .set({ name: patch.name })
    .where(inArray(merchants.id, ids))
    .returning();
}
