import { desc, eq } from 'drizzle-orm';
import { requireMerchant } from '@/modules/auth/require-merchant';
import { db } from '@/db';
import { creditLedger } from '@/db/schema';
import { currentBalance } from '@/modules/render/credit-ledger';
import { env } from '@/lib/env';
import { PLANS } from '@/config/pricing';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { CreditMeter } from '@/components/credit-meter';
import { Badge } from '@/components/ui/badge';
import { LedgerTable } from './ledger-table';
import { BuyFoundingPassButton } from './buy-founding-pass-button';

export default async function BillingPage() {
  const merchant = await requireMerchant();
  const [balance, ledgerRows] = await Promise.all([
    currentBalance(merchant.id),
    db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.merchantId, merchant.id))
      .orderBy(desc(creditLedger.createdAt))
      .limit(100),
  ]);

  const canBuyFoundingPass = Boolean(env.POLAR_FOUNDING_PASS_PRODUCT_ID);

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title="Billing"
        description="Credits, plan, and purchase history."
        actions={
          merchant.plan === 'founder' ? (
            <Badge>Founder</Badge>
          ) : canBuyFoundingPass ? (
            <BuyFoundingPassButton
              label={`Buy founding pass — ${PLANS.founder.priceCents ? `$${PLANS.founder.priceCents / 100}` : ''}`}
            />
          ) : null
        }
      />

      <Section title="Credits">
        <CreditMeter balance={balance} variant="full" />
      </Section>

      <Section title="Ledger">
        <LedgerTable rows={ledgerRows} />
      </Section>
    </div>
  );
}
