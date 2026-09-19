import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { links, merchants, products, renders } from '@/db/schema';
import { env } from '@/lib/env';
import { formatPriceCents } from '@/lib/format';
import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';

async function loadRender(renderId: string) {
  const [row] = await db
    .select({
      outputUrl: renders.outputUrl,
      isPublic: renders.isPublic,
      productTitle: products.title,
      priceCents: products.priceCents,
      currency: products.currency,
      merchantName: merchants.name,
      slug: links.slug,
    })
    .from(renders)
    .innerJoin(products, eq(renders.productId, products.id))
    .innerJoin(links, eq(renders.linkId, links.id))
    .innerJoin(merchants, eq(links.merchantId, merchants.id))
    .where(eq(renders.id, renderId))
    .limit(1);
  return row;
}

// Section 8.3/9.1: `/r/[renderId]` — public share page. OG tags point at the
// share card (`/api/og/render/[renderId]`) so the link unfurls with the
// render image in WhatsApp/iMessage/Instagram; "See it on you" is the
// re-entry point into `/t/[slug]?via=<renderId>` for the friend who opens it.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ renderId: string }>;
}): Promise<Metadata> {
  const { renderId } = await params;
  const row = await loadRender(renderId);
  if (!row || !row.outputUrl || !row.isPublic) return {};

  const ogUrl = `${env.NEXT_PUBLIC_APP_URL}/api/og/render/${renderId}?format=link`;
  const title = `${row.productTitle} — See it on you`;
  return {
    title,
    openGraph: { title, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [ogUrl] },
  };
}

export default async function SharedRenderPage({
  params,
}: {
  params: Promise<{ renderId: string }>;
}) {
  const { renderId } = await params;
  const row = await loadRender(renderId);
  if (!row || !row.outputUrl || !row.isPublic) notFound();

  const price = formatPriceCents(row.priceCents, row.currency);

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{row.merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">{row.productTitle}</h1>
        {price && <p className="text-sm text-muted-foreground">{price}</p>}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={row.outputUrl}
        alt={row.productTitle}
        className="aspect-[3/4] w-full rounded-md object-cover"
      />

      <Button asChild size="lg" className="w-full">
        <a href={`/t/${row.slug}?via=${renderId}`}>See it on you</a>
      </Button>
    </Container>
  );
}
