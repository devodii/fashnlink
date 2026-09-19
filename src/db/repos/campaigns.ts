import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  campaignItems,
  campaigns,
  products,
  retargetOptins,
  shoppers,
  stores,
  twins,
} from '@/db/schema';
import { newId } from '@/lib/ids';

export async function findEligibleProductsForDrop(merchantId: string, productIds: string[]) {
  if (productIds.length === 0) return [];
  const rows = await db
    .select({ id: products.id, title: products.title })
    .from(products)
    .innerJoin(stores, eq(stores.id, products.storeId))
    .where(
      and(
        eq(stores.merchantId, merchantId),
        eq(products.eligibility, 'eligible'),
        inArray(products.id, productIds),
      ),
    );
  return rows;
}

// Section 9.8: "the number of opted-in shoppers with a ready twin" — a
// shopper must have live consent (not opted out) AND a default twin that's
// actually finished generating, or a drop render for them would fail
// immediately.
export async function countDropAudience(merchantId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(retargetOptins)
    .innerJoin(shoppers, eq(shoppers.id, retargetOptins.shopperId))
    .innerJoin(
      twins,
      and(eq(twins.shopperId, shoppers.id), eq(twins.isDefault, true), eq(twins.status, 'ready')),
    )
    .where(and(eq(retargetOptins.merchantId, merchantId), isNull(retargetOptins.optedOutAt)));
  return row?.n ?? 0;
}

export async function findDropAudience(merchantId: string) {
  return db
    .select({
      shopperId: shoppers.id,
      shopperEmail: shoppers.email,
      twinId: twins.id,
      twinUrl: twins.twinUrl,
    })
    .from(retargetOptins)
    .innerJoin(shoppers, eq(shoppers.id, retargetOptins.shopperId))
    .innerJoin(
      twins,
      and(eq(twins.shopperId, shoppers.id), eq(twins.isDefault, true), eq(twins.status, 'ready')),
    )
    .where(and(eq(retargetOptins.merchantId, merchantId), isNull(retargetOptins.optedOutAt)));
}

export async function createCampaignRow(input: {
  merchantId: string;
  productIds: string[];
  audienceCount: number;
  estimatedCredits: number;
}) {
  const id = newId('campaign');
  await db.insert(campaigns).values({
    id,
    merchantId: input.merchantId,
    kind: 'new_drop',
    status: 'rendering',
    productIds: input.productIds,
    audienceCount: input.audienceCount,
    estimatedCredits: input.estimatedCredits,
  });
  return id;
}

export async function insertCampaignItems(
  rows: { campaignId: string; shopperId: string; productId: string }[],
) {
  if (rows.length === 0) return [];
  const values = rows.map((r) => ({ id: newId('citem'), ...r, status: 'pending' as const }));
  await db.insert(campaignItems).values(values);
  return values.map((v) => v.id);
}

export async function findCampaignForMerchant(campaignId: string, merchantId: string) {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.merchantId, merchantId)))
    .limit(1);
  return row ?? null;
}

export async function countCampaignItemsByStatus(campaignId: string) {
  const rows = await db
    .select({ status: campaignItems.status, n: count() })
    .from(campaignItems)
    .where(eq(campaignItems.campaignId, campaignId))
    .groupBy(campaignItems.status);
  const counts = { pending: 0, rendered: 0, failed: 0, skipped: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}
