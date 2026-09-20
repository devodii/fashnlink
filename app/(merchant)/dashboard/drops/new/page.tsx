import { requireMerchant } from '@/modules/auth/require-merchant';
import { readProduct } from '@/actions/products';
import { PageHeader } from '@/components/page-header';
import { DropForm } from './drop-form';

export default async function NewDropPage() {
  const merchant = await requireMerchant();
  const rows = await readProduct({ merchantId: merchant.id });
  const eligible = rows
    .filter((r) => r.product.eligibility === 'eligible' && r.hasTryonImage)
    .map((r) => ({ id: r.product.id, title: r.product.title }));

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader
        title="New drop"
        description="Show up to 3 new products to shoppers who've already tried something on from you."
      />
      <DropForm products={eligible} />
    </div>
  );
}
