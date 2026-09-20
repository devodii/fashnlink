import { requireMerchant } from '@/modules/auth/require-merchant';
import { retrieveLeads } from '@/actions/leads';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from './leads-table';

export default async function LeadsPage() {
  const merchant = await requireMerchant();
  const resolvedLeads = await retrieveLeads({ merchantId: merchant.id });
  const rows = resolvedLeads.map((lead) => ({
    email: lead.email,
    productTitle: lead.productTitle ?? '',
    source: lead.source,
    createdAt: lead.createdAt,
    count: lead.count ?? 1,
  }));

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="Leads" description="Shoppers who left an email." />
      <LeadsTable rows={rows} />
    </div>
  );
}
