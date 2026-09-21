import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { merchants } from '@/db/schema';
import { grantCredits } from '@/modules/render/credit-ledger';

export const SYSTEM_MERCHANT_ID = 'merch_system_demo';
const SYSTEM_MERCHANT_EMAIL = 'system+demo@internal.invalid';
const BOOTSTRAP_CREDIT_GRANT = 100_000;

// Idempotent, safe to call on every quick-demo request.
export async function ensureSystemMerchant(): Promise<void> {
  const [existing] = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(eq(merchants.id, SYSTEM_MERCHANT_ID))
    .limit(1);

  if (existing) return;

  await db
    .insert(merchants)
    .values({
      id: SYSTEM_MERCHANT_ID,
      email: SYSTEM_MERCHANT_EMAIL,
      name: 'Marketing demo',
      plan: 'free',
      watermarkEnabled: true,
    })
    .onConflictDoNothing();

  await grantCredits(SYSTEM_MERCHANT_ID, BOOTSTRAP_CREDIT_GRANT, 'admin');
}
