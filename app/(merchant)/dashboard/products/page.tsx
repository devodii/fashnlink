import { requireMerchant } from '@/modules/auth/require-merchant';
import { readProduct } from '@/actions/products';
import { PageHeader } from '@/components/page-header';
import { ProductsTable } from './products-table';

export default async function ProductsPage() {
  const merchant = await requireMerchant();
  const rows = await readProduct({ merchantId: merchant.id });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="Products" description="Your synced catalog." />
      <ProductsTable rows={rows} />
    </div>
  );
}
