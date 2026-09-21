import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { links, merchants, products, renders } from '@/db/schema';
import { retrieveShoppers } from '@/actions/shoppers';
import { retrieveTwins } from '@/actions/twins';
import { retrieveRetargetOptins } from '@/actions/retarget-optins';
import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { ImagesIcon } from '@phosphor-icons/react/ssr';
import { Closet } from './closet';
import { RetargetOptins } from './retarget-optins';

export default async function ClosetPage() {
  const { shopperId } = await retrieveShoppers({ cookieOnly: true });

  if (!shopperId) {
    return (
      <Container size="sm" className="flex flex-1 items-center justify-center py-16">
        <EmptyState
          icon={ImagesIcon}
          title="Nothing here yet"
          description="Try something on from a shop's link and it'll show up here."
        />
      </Container>
    );
  }

  const [rows, twinRows, [shopper], optins] = await Promise.all([
    db
      .select({
        renderId: renders.id,
        outputUrl: renders.outputUrl,
        isPublic: renders.isPublic,
        buyUrl: products.buyUrl,
        productTitle: products.title,
        merchantName: merchants.name,
        createdAt: renders.createdAt,
      })
      .from(renders)
      .innerJoin(products, eq(renders.productId, products.id))
      .innerJoin(links, eq(renders.linkId, links.id))
      .innerJoin(merchants, eq(links.merchantId, merchants.id))
      .where(eq(renders.shopperId, shopperId))
      .orderBy(desc(renders.createdAt)),
    retrieveTwins({ shopperIds: [shopperId] }),
    retrieveShoppers({ ids: [shopperId] }),
    retrieveRetargetOptins({
      shopperIds: [shopperId],
      activeOnly: true,
      withMerchantName: true,
    }),
  ]);

  const shopperTwins = twinRows.map((twin) => ({
    id: twin.id,
    twinUrl: twin.twinUrl,
    isDefault: twin.isDefault,
  }));

  const withImage = rows.filter((r) => r.outputUrl);

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <h1 className="text-lg font-medium text-foreground">Your closet</h1>
      <Closet
        renders={withImage.map((r) => ({
          renderId: r.renderId,
          outputUrl: r.outputUrl as string,
          isPublic: r.isPublic,
          buyUrl: r.buyUrl,
          productTitle: r.productTitle,
          merchantName: r.merchantName,
        }))}
        twins={shopperTwins}
        hasEmail={!!shopper?.email}
      />
      {optins.length > 0 && (
        <RetargetOptins
          merchants={optins.map((o) => ({
            merchantId: o.merchantId,
            merchantName: o.merchantName ?? '',
          }))}
        />
      )}
    </Container>
  );
}
