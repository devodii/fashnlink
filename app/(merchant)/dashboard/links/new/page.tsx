import { requireMerchant } from '@/modules/auth/require-merchant';
import { PageHeader } from '@/components/page-header';
import { NewLinkForm } from './new-link-form';

export default async function NewLinkPage() {
  await requireMerchant();

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="New link" description="Paste a product URL to create a try-on link." />
      <NewLinkForm />
    </div>
  );
}
