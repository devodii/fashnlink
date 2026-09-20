import Link from 'next/link';
import { requireMerchant } from '@/modules/auth/require-merchant';
import { currentBalance } from '@/modules/render/credit-ledger';
import { retrieveLinks } from '@/actions/links';
import { retrieveDashboard } from '@/actions/dashboard';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { CreditMeter } from '@/components/credit-meter';
import { KpiRow } from '@/components/kpi-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinksTable } from './links/links-table';

export default async function DashboardOverviewPage() {
  const merchant = await requireMerchant();
  const [balance, stats, resolvedLinks] = await Promise.all([
    currentBalance(merchant.id),
    retrieveDashboard(merchant.id),
    retrieveLinks({ merchantId: merchant.id, withProduct: true }),
  ]);
  const links = resolvedLinks.map((link) => ({
    link,
    productTitle: link.product?.title ?? null,
  }));

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title="Overview"
        description="Your links, renders, and credits at a glance."
        actions={
          <Badge variant="secondary" className="capitalize">
            {merchant.plan}
          </Badge>
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
