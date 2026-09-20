import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { links, merchants, products, renders, retargetOptins, shoppers, twins } from '@/db/schema';
import { readShopperId } from '@/modules/shoppers';
import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { Images } from '@phosphor-icons/react/ssr';
import { Closet } from './closet';
import { RetargetOptins } from './retarget-optins';

export default async function ClosetPage() {
  const shopperId = await readShopperId();

  if (!shopperId) {
    return (
      <Container size="sm" className="flex flex-1 items-center justify-center py-16">
        <EmptyState
          icon={Images}
          title="Nothing here yet"
          description="Try something on from a shop's link and it'll show up here."
        />
      </Container>
    );
  }

  const rows = await db
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
    .orderBy(desc(renders.createdAt));

  const shopperTwins = await db
    .select({ id: twins.id, twinUrl: twins.twinUrl, isDefault: twins.isDefault })
    .from(twins)
    .where(eq(twins.shopperId, shopperId));

  const [shopper] = await db
    .select({ email: shoppers.email })
    .from(shoppers)
    .where(eq(shoppers.id, shopperId))
    .limit(1);

  const optins = await db
    .select({ merchantId: retargetOptins.merchantId, merchantName: merchants.name })
    .from(retargetOptins)
    .innerJoin(merchants, eq(retargetOptins.merchantId, merchants.id))
    .where(and(eq(retargetOptins.shopperId, shopperId), isNull(retargetOptins.optedOutAt)));

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
      {optins.length > 0 && <RetargetOptins merchants={optins} />}
    </Container>
  );
}
