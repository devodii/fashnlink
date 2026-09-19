import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { links, merchants, products, renders, shoppers, twins } from '@/db/schema';
import { readShopperId } from '@/modules/shoppers';
import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { Images } from 'lucide-react';
import { Closet } from './closet';

// Section 8.3: `/me` — the closet. All the shopper's renders across every
// merchant, newest first, grouped by merchant. Anonymous shoppers (no
// cookie yet — they've never actually tried anything on) see the empty
// state; there's nothing to fetch for an id that doesn't exist.
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
    </Container>
  );
}
