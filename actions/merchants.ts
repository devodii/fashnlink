import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { merchants, planEnum } from '@/db/schema';
import type { ContactChannel } from '@/config/contact-channel';

export type MerchantSettings = {
  contactChannel?: ContactChannel;
  accentToken?: string;
  logoUrl?: string;
};

type MerchantPlan = (typeof planEnum.enumValues)[number];

export async function readMerchant(params: { countByPlan: MerchantPlan }): Promise<number>;
export async function readMerchant(params: {
  id: string;
}): Promise<typeof merchants.$inferSelect | null>;
export async function readMerchant(params: {
  id?: string;
  countByPlan?: MerchantPlan;
}): Promise<unknown> {
  if (params.countByPlan) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(merchants)
      .where(eq(merchants.plan, params.countByPlan));
    return row?.count ?? 0;
  }

  if (params.id) {
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, params.id))
      .limit(1);
    return merchant ?? null;
  }

  return null;
}

export async function updateMerchant(
  id: string,
  patch: { name?: string; settings?: Partial<MerchantSettings> },
) {
  if (patch.name !== undefined) {
    await db.update(merchants).set({ name: patch.name }).where(eq(merchants.id, id));
  }

  if (patch.settings !== undefined) {
    const [current] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
    if (current) {
      const nextSettings = { ...(current.settings as MerchantSettings), ...patch.settings };
      await db.update(merchants).set({ settings: nextSettings }).where(eq(merchants.id, id));
    }
  }
}

// merchants repo never had create/delete verbs (accounts are created via
// better-auth and deleted via src/modules/auth/delete-account.ts, both out
// of this refactor's scope), so no createMerchant/deleteMerchant here.
