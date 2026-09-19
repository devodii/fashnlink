import Link from 'next/link';
import { requireMerchant } from '@/modules/auth/require-merchant';
import { currentBalance } from '@/modules/render/credit-ledger';
import { dashboardStats, findLinksWithProductByMerchant } from '@/db/repos/links';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { CreditMeter } from '@/components/credit-meter';
import { KpiRow } from '@/components/kpi-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';
import { PLANS } from '@/config/pricing';
import { LinksTable } from './links/links-table';

export default async function DashboardOverviewPage() {
  const merchant = await requireMerchant();
  const [balance, stats, links] = await Promise.all([
    currentBalance(merchant.id),
    dashboardStats(merchant.id),
    findLinksWithProductByMerchant(merchant.id),
  ]);

  const checkoutUrl = env.POLAR_FOUNDING_PASS_CHECKOUT_LINK
    ? `${env.POLAR_FOUNDING_PASS_CHECKOUT_LINK}?customer_external_id=${merchant.id}`
    : null;

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title="Overview"
        description="Your links, renders, and credits at a glance."
        actions={
          merchant.plan === 'free' && checkoutUrl ? (
            <Button asChild>
              <a href={checkoutUrl}>
                Buy founding pass —{' '}
                {PLANS.founder.priceCents ? `$${PLANS.founder.priceCents / 100}` : ''}
              </a>
            </Button>
          ) : (
            <Badge variant="secondary" className="capitalize">
              {merchant.plan}
            </Badge>
          )
        }
      />

      <Section title="Credits">
        <CreditMeter balance={balance} variant="full" />
      </Section>

      <Section title="Last 30 days">
        <KpiRow
          stats={[
            { label: 'Links created', value: stats.links },
            { label: 'Renders', value: stats.renders },
            { label: 'Shares', value: stats.shares },
            { label: 'Leads', value: stats.leads },
          ]}
        />
      </Section>

      <Section
        title="Recent links"
        aside={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/links/new">New link</Link>
          </Button>
        }
      >
        <LinksTable rows={links.slice(0, 10)} />
      </Section>
    </div>
  );
}
