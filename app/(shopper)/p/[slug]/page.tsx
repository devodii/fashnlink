import { and, desc, eq, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { links, merchants, products, renders, twins } from '@/db/schema';
import { isPollClosed } from '@/db/repos/links';
import { readShopperId } from '@/modules/shoppers';
import { PollVoteView } from './poll-vote-view';

export default async function PollPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { slug } = await params;
  const { s: creatorShopperId } = await searchParams;

  const [link] = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  if (!link || link.kind !== 'poll' || link.status === 'archived') notFound();

  const [merchant] = await db
    .select({ name: merchants.name })
    .from(merchants)
    .where(eq(merchants.id, link.merchantId))
    .limit(1);

  const pollProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, link.productIds));

  const creatorRenders = creatorShopperId
    ? await db
        .select()
        .from(renders)
        .where(
          and(
            eq(renders.linkId, link.id),
            eq(renders.shopperId, creatorShopperId),
            eq(renders.status, 'succeeded'),
          ),
        )
        .orderBy(desc(renders.createdAt))
    : [];

  const renderByProduct = new Map<string, (typeof creatorRenders)[number]>();
  for (const r of creatorRenders) {
    if (!renderByProduct.has(r.productId)) renderByProduct.set(r.productId, r);
  }

  const options = link.productIds
    .map((id) => {
      const product = pollProducts.find((p) => p.id === id);
      const render = renderByProduct.get(id);
      if (!product || !render || !render.outputUrl) return null;
      return {
        productId: id,
        productTitle: product.title,
        renderId: render.id,
        imageUrl: render.outputUrl,
      };
    })
    .filter((o): o is NonNullable<typeof o> => !!o);

  const viewerShopperId = await readShopperId();
  const viewerTwin = viewerShopperId
    ? await db
        .select({ id: twins.id, status: twins.status, twinUrl: twins.twinUrl })
        .from(twins)
        .where(and(eq(twins.shopperId, viewerShopperId), eq(twins.isDefault, true)))
        .orderBy(desc(twins.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  return (
    <PollVoteView
      linkId={link.id}
      merchantName={merchant?.name ?? 'This shop'}
      options={options}
      closed={isPollClosed(link)}
      defaultTwin={viewerTwin}
    />
  );
}
