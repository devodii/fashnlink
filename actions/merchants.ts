import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  account,
  creditLedger,
  espConnections,
  leads,
  links,
  merchants,
  platformRequests,
  retargetOptins,
  session,
  stores,
  user,
} from '@/db/schema';
import type { Merchant, Plan } from '@/db/schema';
import type { ContactChannel } from '@/constants';
import { auth } from '@/actions/auth';

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

export async function deleteMerchants(ids: string[]): Promise<Merchant[]> {
  if (ids.length === 0) return [];

  const targets = await db
    .select({ id: merchants.id, email: merchants.email })
    .from(merchants)
    .where(inArray(merchants.id, ids));
  if (targets.length === 0) return [];

  await db.update(links).set({ status: 'archived' }).where(inArray(links.merchantId, ids));
  await db.update(stores).set({ merchantId: null }).where(inArray(stores.merchantId, ids));
  await db.delete(leads).where(inArray(leads.merchantId, ids));
  await db.delete(creditLedger).where(inArray(creditLedger.merchantId, ids));
  await db.delete(espConnections).where(inArray(espConnections.merchantId, ids));
  await db.delete(retargetOptins).where(inArray(retargetOptins.merchantId, ids));
  await db
    .update(platformRequests)
    .set({ firstMerchantId: null })
    .where(inArray(platformRequests.firstMerchantId, ids));

  const deleted = await db.delete(merchants).where(inArray(merchants.id, ids)).returning();

  const emails = targets.map((target) => target.email);
  const authUsers = await db.select({ id: user.id }).from(user).where(inArray(user.email, emails));
  if (authUsers.length > 0) {
    const userIds = authUsers.map((authUser) => authUser.id);
    await db.delete(session).where(inArray(session.userId, userIds));
    await db.delete(account).where(inArray(account.userId, userIds));
    await db.delete(user).where(inArray(user.id, userIds));
  }

  return deleted;
}

// ------------------------------ AUTH ------------------------------
export const requireMerchant = cache(async () => {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession?.user?.email) redirect('/login');

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.email, authSession.user.email))
    .limit(1);

  if (!merchant) redirect('/login');
  return merchant;
});
