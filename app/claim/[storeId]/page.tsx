import { notFound } from 'next/navigation';
import { retrieveClaims, CLAIM_VISIBLE_THRESHOLD } from '@/actions/claims';
import { retrieveStores } from '@/actions/stores';
import { Container } from '@/components/container';
import { ClaimButton } from './claim-button';

export default async function ClaimPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;

  const [store] = await retrieveStores({ ids: [storeId] });
  if (!store) notFound();
  if (store.merchantId) notFound();

  const claimRows = await retrieveClaims({ storeIds: [storeId] });
  const totalRenders = claimRows.reduce((sum, row) => sum + row.renderCount, 0);
  if (totalRenders < CLAIM_VISIBLE_THRESHOLD) notFound();

  return (
    <Container size="sm" className="flex-1 space-y-6 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium text-foreground">
          {totalRenders} people tried on items from {store.domain} this week.
        </h1>
        <p className="text-sm text-muted-foreground">
          Shoppers have been trying your products on themselves, but you haven&apos;t claimed this
          store yet.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {claimRows.slice(0, 6).map((row) => (
          <div
            key={row.id}
            className="aspect-3/4 rounded-md bg-muted blur-md"
            aria-label={row.productTitle ?? undefined}
          />
        ))}
      </div>

      <ClaimButton storeId={storeId} />
    </Container>
  );
}
