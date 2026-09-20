import Link from 'next/link';
import { and, count, eq, isNull } from 'drizzle-orm';
import { requireMerchant } from '@/actions/merchants';
import { db } from '@/db';
import { cartEvents, campaignItems, campaigns, espConnections, retargetOptins } from '@/db/schema';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { KpiRow } from '@/components/kpi-row';
import { Button } from '@/components/ui/button';
import { RetargetingForm } from './retargeting-form';

export default async function RetargetingPage() {
  const merchant = await requireMerchant();

  const [connection] = await db
    .select()
    .from(espConnections)
    .where(eq(espConnections.merchantId, merchant.id))
    .limit(1);
  const settings = (connection?.settings ?? {}) as { abandonedEnabled?: boolean };

  const [[optinCount], [abandonedCount], [dropDeliveredCount]] = await Promise.all([
    db
      .select({ n: count() })
      .from(retargetOptins)
      .where(and(eq(retargetOptins.merchantId, merchant.id), isNull(retargetOptins.optedOutAt))),
    db
      .select({ n: count() })
      .from(cartEvents)
      .where(and(eq(cartEvents.merchantId, merchant.id), eq(cartEvents.kind, 'tryon_no_buy'))),
    db
      .select({ n: count() })
      .from(campaignItems)
      .innerJoin(campaigns, eq(campaignItems.campaignId, campaigns.id))
      .where(and(eq(campaigns.merchantId, merchant.id), eq(campaignItems.status, 'rendered'))),
  ]);

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title="Retargeting"
        description="Show shoppers wearing your products in the emails your ESP already sends."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/drops/new">New drop</Link>
          </Button>
        }
      />

      <Section title="Metrics">
        <KpiRow
          stats={[
            { label: 'Opted-in shoppers', value: optinCount?.n ?? 0 },
            { label: 'Abandoned events pushed', value: abandonedCount?.n ?? 0 },
            { label: 'Drop items delivered', value: dropDeliveredCount?.n ?? 0 },
          ]}
        />
        {/* Section 9.8: "Copy in the UI must say 'measure it in your ESP',
            never a conversion promise"; counts only, no revenue claims. */}
        <p className="text-xs text-muted-foreground">
          These are event counts, not revenue, so measure conversion in your ESP.
        </p>
      </Section>

      <Section title="Connect your ESP">
        <RetargetingForm
          connected={!!connection}
          provider={connection?.provider ?? null}
          status={connection?.status ?? null}
          abandonedEnabled={settings.abandonedEnabled ?? true}
        />
      </Section>

      <Section
        title="Flow templates"
        description="A starting point for the flow that shows these looks in your ESP."
      >
        <Button asChild variant="outline">
          <a href="/api/esp-templates/klaviyo-abandoned" download="klaviyo-abandoned.json">
            Download Klaviyo abandoned-cart flow (JSON)
          </a>
        </Button>
      </Section>
    </div>
  );
}
