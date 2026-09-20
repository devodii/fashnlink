import { requireMerchant } from '@/modules/auth/require-merchant';
import { retrieveProducts } from '@/actions/products';
import { PageHeader } from '@/components/page-header';
import { ProductsTable } from './products-table';

export default async function ProductsPage() {
  const merchant = await requireMerchant();
  const resolvedProducts = await retrieveProducts({ merchantId: merchant.id });
  const rows = resolvedProducts.map((product) => ({
    product,
    hasTryonImage: product.hasTryonImage ?? false,
  }));

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="Products" description="Your synced catalog." />
      <ProductsTable rows={rows} />
    </div>
  );
}
