import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { merchants } from '@/db/schema';
import { grantCredits } from '@/modules/render/credit-ledger';

// Section 8.1: the marketing quick-link demo creates a real, shareable
// `/t/[slug]` link before anyone has an account. `links.merchantId` stays
// NOT NULL (every other subsystem — credit ledger, leads, the fal webhook's
// watermark/plan lookup — already assumes a real owning merchant, and
// reworking all of them to handle a null merchant was a much larger, riskier
// change than giving demo links one fixed, low-privilege, always-watermarked
// "system" merchant to belong to). `claims` (section 9.6) is still how a
// demo's underlying STORE later gets attached to a real merchant — the
// system merchant only ever owns the link, never the store.
export const SYSTEM_MERCHANT_ID = 'merch_system_demo';
const SYSTEM_MERCHANT_EMAIL = 'system+demo@internal.invalid';
const BOOTSTRAP_CREDIT_GRANT = 100_000;

// Idempotent — safe to call on every quick-demo request. Real IP rate
// limiting (section 13: 3/day) is what actually caps abuse; this balance
// only exists so the credit-ledger's own INSUFFICIENT_CREDITS guard (section
// 7.3) never fires for legitimate demo traffic between real top-ups.
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
