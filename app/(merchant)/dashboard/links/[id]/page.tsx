import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { requireMerchant } from '@/actions/merchants';
import { db } from '@/db';
import { renders, leads } from '@/db/schema';
import { retrieveLinks } from '@/actions/links';
import { retrieveProducts } from '@/actions/products';
import { env } from '@/lib/env';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { CopyField } from '@/components/copy-field';
import { QrCode } from '@/components/qr-code';
import { PhoneFrame } from '@/components/phone-frame';
import { StatusBadge } from '@/components/status-badge';
import { MediaGrid } from '@/components/media-grid';
import { EmptyState } from '@/components/empty-state';
import { ImageIcon } from '@phosphor-icons/react/ssr';
import { PauseArchiveButtons, GarmentCategoryField } from './link-actions';

const RENDER_STATUS_MAP = {
  queued: { label: 'Queued', tone: 'neutral' as const },
  running: { label: 'Running', tone: 'neutral' as const },
  succeeded: { label: 'Succeeded', tone: 'success' as const },
  failed: { label: 'Failed', tone: 'destructive' as const },
  blocked: { label: 'Blocked', tone: 'destructive' as const },
};

export default async function LinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const merchant = await requireMerchant();
  const { id } = await params;

  const [link] = await retrieveLinks({ ids: [id] });
  if (!link || link.merchantId !== merchant.id) notFound();

  const productId = link.productIds[0];

  const [[resolvedProduct], linkRenders] = await Promise.all([
    retrieveProducts({ ids: [productId], withImages: true }),
    db
      .select({
        id: renders.id,
        status: renders.status,
        via: renders.via,
        createdAt: renders.createdAt,
        leadEmail: leads.email,
      })
      .from(renders)
      .leftJoin(leads, eq(leads.renderId, renders.id))
      .where(eq(renders.linkId, link.id))
      .orderBy(desc(renders.createdAt))
      .limit(50),
  ]);
  if (!resolvedProduct) notFound();

  const images = resolvedProduct?.images ?? [];

  const fullUrl = `${env.NEXT_PUBLIC_APP_URL}/t/${link.slug}`;

  return (
    <div className="space-y-8 p-4 md:p-8">
      <PageHeader
        title={resolvedProduct.title ?? link.slug}
        description="Manage this try-on link."
        actions={<PauseArchiveButtons linkId={link.id} status={link.status} />}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Link">
          <CopyField label="Public URL" value={fullUrl} />
          <div className="flex items-center gap-4">
            <QrCode value={fullUrl} copyable />
            <PhoneFrame src={`/t/${link.slug}?preview=1`} />
          </div>
        </Section>

        <Section title="Product">
          {resolvedProduct && (
            <>
              <p className="text-sm text-muted-foreground">{resolvedProduct.title}</p>
              <GarmentCategoryField linkId={link.id} value={resolvedProduct.garmentCategory} />
              <MediaGrid
                items={images.map((img) => ({
                  src: img.url,
                  alt: img.alt ?? resolvedProduct.title,
                  aspect: '3/4' as const,
                }))}
                columns={{ base: 3 }}
                emptyState={<EmptyState icon={ImageIcon} title="No images" />}
              />
            </>
          )}
        </Section>
      </div>

      <Section
        title="Renders"
        description="Shopper renders are private: thumbnails only, never downloadable."
      >
        {linkRenders.length === 0 ? (
          <EmptyState icon={ImageIcon} title="No renders yet" />
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {linkRenders.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} map={RENDER_STATUS_MAP} />
                  <span className="text-muted-foreground capitalize">{r.via}</span>
                </div>
                <span className="text-muted-foreground">{r.leadEmail ?? '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
