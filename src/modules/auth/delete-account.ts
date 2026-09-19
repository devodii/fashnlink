import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  merchants,
  stores,
  links,
  leads,
  creditLedger,
  platformRequests,
  espConnections,
  retargetOptins,
} from '@/db/schema';
import { user, session, account } from '@/db/auth-schema';

export async function deleteMerchantAccount(merchantId: string, email: string): Promise<void> {
  await db.update(links).set({ status: 'archived' }).where(eq(links.merchantId, merchantId));
  await db.update(stores).set({ merchantId: null }).where(eq(stores.merchantId, merchantId));

  await db.delete(leads).where(eq(leads.merchantId, merchantId));
  await db.delete(creditLedger).where(eq(creditLedger.merchantId, merchantId));
  await db.delete(espConnections).where(eq(espConnections.merchantId, merchantId));
  await db.delete(retargetOptins).where(eq(retargetOptins.merchantId, merchantId));
  await db
    .update(platformRequests)
    .set({ firstMerchantId: null })
    .where(eq(platformRequests.firstMerchantId, merchantId));

  await db.delete(merchants).where(eq(merchants.id, merchantId));

  const [authUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (authUser) {
    await db.delete(session).where(eq(session.userId, authUser.id));
    await db.delete(account).where(eq(account.userId, authUser.id));
    await db.delete(user).where(eq(user.id, authUser.id));
  }
}
