import { requireMerchant } from '@/modules/auth/require-merchant';
import { readLead } from '@/actions/leads';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from './leads-table';

export default async function LeadsPage() {
  const merchant = await requireMerchant();
  const rows = await readLead({ merchantId: merchant.id });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="Leads" description="Shoppers who left an email." />
      <LeadsTable rows={rows} />
    </div>
  );
}
