import { requireMerchant } from '@/modules/auth/require-merchant';
import { findLeadsForMerchant } from '@/db/repos/leads';
import { PageHeader } from '@/components/page-header';
import { LeadsTable } from './leads-table';

export default async function LeadsPage() {
  const merchant = await requireMerchant();
  const rows = await findLeadsForMerchant(merchant.id);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="Leads" description="Shoppers who left an email." />
      <LeadsTable rows={rows} />
    </div>
  );
}
