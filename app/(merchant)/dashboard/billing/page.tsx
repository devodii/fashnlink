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
import { Button } from '@/components/ui/button';
import { LedgerTable } from './ledger-table';

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

  const checkoutUrl = env.POLAR_FOUNDING_PASS_CHECKOUT_LINK
    ? `${env.POLAR_FOUNDING_PASS_CHECKOUT_LINK}?customer_external_id=${merchant.id}`
    : null;

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title="Billing"
        description="Credits, plan, and purchase history."
        actions={
          merchant.plan === 'founder' ? (
            <Badge>Founder</Badge>
          ) : checkoutUrl ? (
            <Button asChild>
              <a href={checkoutUrl}>
                Buy founding pass —{' '}
                {PLANS.founder.priceCents ? `$${PLANS.founder.priceCents / 100}` : ''}
              </a>
            </Button>
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
