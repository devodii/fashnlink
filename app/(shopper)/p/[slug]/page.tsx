import { and, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { retrieveLinks } from '@/actions/links';
import { retrieveTwins } from '@/actions/twins';
import { retrieveShoppers } from '@/actions/shoppers';
import { retrieveMerchants } from '@/actions/merchants';
import { retrieveProducts } from '@/actions/products';
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

  const [link] = await retrieveLinks({ slugs: [slug] });
  if (!link || link.kind !== 'poll' || link.status === 'archived') notFound();

  const [[merchant], pollProducts] = await Promise.all([
    retrieveMerchants({ ids: [link.merchantId] }),
    retrieveProducts({ ids: link.productIds }),
  ]);

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

  const { shopperId: viewerShopperId } = await retrieveShoppers({ cookieOnly: true });
  const [resolvedViewerTwin] = viewerShopperId
    ? await retrieveTwins({ shopperIds: [viewerShopperId], isDefault: true })
    : [];
  const viewerTwin = resolvedViewerTwin
    ? {
        id: resolvedViewerTwin.id,
        status: resolvedViewerTwin.status,
        twinUrl: resolvedViewerTwin.twinUrl,
      }
    : null;

  return (
    <PollVoteView
      linkId={link.id}
      merchantName={merchant?.name ?? 'This shop'}
      options={options}
      closed={link.isClosed ?? false}
      defaultTwin={viewerTwin}
    />
  );
}
