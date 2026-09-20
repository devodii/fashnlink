import { requireMerchant } from '@/modules/auth/require-merchant';
import { retrieveProducts } from '@/actions/products';
import { PageHeader } from '@/components/page-header';
import { DropForm } from './drop-form';

export default async function NewDropPage() {
  const merchant = await requireMerchant();
  const rows = await retrieveProducts({ merchantId: merchant.id });
  const eligible = rows
    .filter((r) => r.eligibility === 'eligible' && r.hasTryonImage)
    .map((r) => ({ id: r.id, title: r.title }));

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
