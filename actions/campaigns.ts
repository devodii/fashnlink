import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, campaigns, retargetOptins, shoppers, twins } from '@/db/schema';
import { newId } from '@/lib/ids';

export async function createCampaign(input: {
  merchantId: string;
  productIds: string[];
  audienceCount: number;
  estimatedCredits: number;
  items?: { shopperId: string; productId: string }[];
}) {
  const campaignId = newId('campaign');
  await db.insert(campaigns).values({
    id: campaignId,
    merchantId: input.merchantId,
    kind: 'new_drop',
    status: 'rendering',
    productIds: input.productIds,
    audienceCount: input.audienceCount,
    estimatedCredits: input.estimatedCredits,
  });

  if (!input.items || input.items.length === 0) {
    return { campaignId, itemIds: [] as string[] };
  }

  const values = input.items.map((item) => ({
    id: newId('citem'),
    campaignId,
    ...item,
    status: 'pending' as const,
  }));
  await db.insert(campaignItems).values(values);

  return { campaignId, itemIds: values.map((v) => v.id) };
}

export async function readCampaign(params: {
  audienceForMerchantId: string;
  audienceCountOnly: true;
}): Promise<number>;
export async function readCampaign(params: {
  audienceForMerchantId: string;
}): Promise<
  { shopperId: string; shopperEmail: string | null; twinId: string; twinUrl: string | null }[]
>;
export async function readCampaign(params: {
  id: string;
  itemCountsOnly: true;
}): Promise<{ pending: number; rendered: number; failed: number; skipped: number }>;
export async function readCampaign(params: {
  id: string;
  merchantId?: string;
}): Promise<typeof campaigns.$inferSelect | null>;
export async function readCampaign(params: {
  id?: string;
  merchantId?: string;
  itemCountsOnly?: boolean;
  audienceForMerchantId?: string;
  audienceCountOnly?: boolean;
}): Promise<unknown> {
  // Audience sizing for a not-yet-created drop campaign: no campaigns.ts
  // table owns shoppers/twins/retargetOptins, and this data only ever
  // exists to support campaign creation/estimation, so it lives here rather
  // than in a one-off new domain file.
  if (params.audienceForMerchantId) {
    const audienceCondition = and(
      eq(retargetOptins.merchantId, params.audienceForMerchantId),
      isNull(retargetOptins.optedOutAt),
    );
    const twinCondition = and(
      eq(twins.shopperId, shoppers.id),
      eq(twins.isDefault, true),
      eq(twins.status, 'ready'),
    );

    if (params.audienceCountOnly) {
      const [row] = await db
        .select({ n: count() })
        .from(retargetOptins)
        .innerJoin(shoppers, eq(shoppers.id, retargetOptins.shopperId))
        .innerJoin(twins, twinCondition)
        .where(audienceCondition);
      return row?.n ?? 0;
    }

    return db
      .select({
        shopperId: shoppers.id,
        shopperEmail: shoppers.email,
        twinId: twins.id,
        twinUrl: twins.twinUrl,
      })
      .from(retargetOptins)
      .innerJoin(shoppers, eq(shoppers.id, retargetOptins.shopperId))
      .innerJoin(twins, twinCondition)
      .where(audienceCondition);
  }

  if (params.id && params.itemCountsOnly) {
    const rows = await db
      .select({ status: campaignItems.status, n: count() })
      .from(campaignItems)
      .where(eq(campaignItems.campaignId, params.id))
      .groupBy(campaignItems.status);
    const counts = { pending: 0, rendered: 0, failed: 0, skipped: 0 };
    for (const r of rows) counts[r.status] = r.n;
    return counts;
  }

  if (params.id) {
    const condition = params.merchantId
      ? and(eq(campaigns.id, params.id), eq(campaigns.merchantId, params.merchantId))
      : eq(campaigns.id, params.id);
    const [row] = await db.select().from(campaigns).where(condition).limit(1);
    return row ?? null;
  }

  return null;
}

// campaigns repo never had its own update/delete verb (status transitions
// live directly in src/modules/campaigns/finalize.ts, out of this
// refactor's scope), so no updateCampaign/deleteCampaign here.
