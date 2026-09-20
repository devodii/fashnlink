import Link from 'next/link';
import { requireMerchant } from '@/modules/auth/require-merchant';
import { readLink } from '@/actions/links';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { LinksTable } from './links-table';

export default async function LinksPage() {
  const merchant = await requireMerchant();
  const links = await readLink({ merchantId: merchant.id, withProduct: true });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader
        title="Links"
        description="Every try-on link you've created."
        actions={
          <Button asChild>
            <Link href="/dashboard/links/new">New link</Link>
          </Button>
        }
      />
      <LinksTable rows={links} />
    </div>
  );
}
