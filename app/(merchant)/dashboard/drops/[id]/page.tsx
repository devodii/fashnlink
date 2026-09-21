import { notFound } from 'next/navigation';
import { requireMerchant } from '@/actions/merchants';
import { retrieveCampaigns } from '@/actions/campaigns';
import { db } from '@/db';
import { campaignItems, products } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { KpiRow } from '@/components/kpi-row';
import { StatusBadge } from '@/components/status-badge';

export default async function DropStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const merchant = await requireMerchant();

  // All three only need `id`/`merchant.id`, already known; ownership is
  // checked below, after all three have resolved.
  const [[campaign], [withCounts], previewRows] = await Promise.all([
    retrieveCampaigns({ ids: [id], merchantId: merchant.id }),
    retrieveCampaigns({ ids: [id], withItemCounts: true }),
    // Never surfaces the actual shopper render images to the merchant, product titles only.
    db
      .select({ productTitle: products.title })
      .from(campaignItems)
      .innerJoin(products, eq(products.id, campaignItems.productId))
      .where(and(eq(campaignItems.campaignId, id), eq(campaignItems.status, 'rendered')))
      .limit(3),
  ]);
  if (!campaign) notFound();

  const counts = withCounts?.itemCounts ?? { pending: 0, rendered: 0, failed: 0, skipped: 0 };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title="Drop status"
        description={`Started ${campaign.createdAt.toLocaleDateString()}`}
        actions={
          <StatusBadge
            status={campaign.status}
            map={{
              estimating: { label: 'Estimating', tone: 'neutral' },
              rendering: { label: 'Rendering', tone: 'warning' },
              ready: { label: 'Ready', tone: 'success' },
              synced: { label: 'Synced', tone: 'success' },
              cancelled: { label: 'Cancelled', tone: 'destructive' },
            }}
          />
        }
      />

      <Section title="Progress">
        <KpiRow
          stats={[
            { label: 'Pending', value: counts.pending },
            { label: 'Rendered', value: counts.rendered },
            { label: 'Failed', value: counts.failed },
            { label: 'Skipped', value: counts.skipped },
          ]}
        />
      </Section>

      {previewRows.length > 0 && (
        <Section title="Preview" description="A sample of what shoppers are seeing.">
          <div className="grid grid-cols-3 gap-3">
            {previewRows.map((row, i) => (
              <div
                key={i}
                className="flex aspect-3/4 items-center justify-center rounded-md bg-muted p-2 text-center text-xs text-muted-foreground"
              >
                {row.productTitle}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
