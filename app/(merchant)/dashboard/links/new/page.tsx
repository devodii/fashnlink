import { requireMerchant } from '@/modules/auth/require-merchant';
import { PageHeader } from '@/components/page-header';
import { NewLinkForm } from './new-link-form';

// DECISION: the spec's secondary "Upload a photo instead" tab (section 8.2)
// needs its own manual-product API route (M2's `manual` scraper adapter
// exists, but nothing calls it over HTTP yet) — left for a follow-up rather
// than half-building an upload flow with no server side to land on. The
// primary URL path below is the one M5's directive calls "highest value."
export default async function NewLinkPage() {
  await requireMerchant();

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="New link" description="Paste a product URL to create a try-on link." />
      <NewLinkForm />
    </div>
  );
}
