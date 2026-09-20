import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, campaigns, retargetOptins, shoppers, twins } from '@/db/schema';
import type { Campaign, ResolvedCampaign, ResolvedShopper } from '@/db/schema';
import { newId } from '@/lib/ids';

type CreateCampaignInput = Pick<
  Campaign,
  'merchantId' | 'productIds' | 'audienceCount' | 'estimatedCredits'
> & {
  items?: { shopperId: string; productId: string }[];
};

// itemIds isn't a schema column; it's the create-time ids of the campaign
// items inserted alongside each campaign, needed by callers to enqueue jobs.
export async function createCampaigns(
  inputs: CreateCampaignInput[],
): Promise<(Campaign & { itemIds: string[] })[]> {
  if (inputs.length === 0) return [];

  const rows = inputs.map((input) => ({
    id: newId('campaign'),
    merchantId: input.merchantId,
    kind: 'new_drop' as const,
    status: 'rendering' as const,
    productIds: input.productIds,
    audienceCount: input.audienceCount,
    estimatedCredits: input.estimatedCredits,
  }));
  const created = await db.insert(campaigns).values(rows).returning();

  const itemsByCampaign = new Map<string, string[]>();
  const itemRows = inputs.flatMap((input, i) => {
    const campaignId = rows[i].id;
    const items = (input.items ?? []).map((item) => ({
      id: newId('citem'),
      campaignId,
      ...item,
      status: 'pending' as const,
    }));
    itemsByCampaign.set(
      campaignId,
      items.map((item) => item.id),
    );
    return items;
  });
  if (itemRows.length > 0) await db.insert(campaignItems).values(itemRows);

  return created.map((campaign) => ({
    ...campaign,
    itemIds: itemsByCampaign.get(campaign.id) ?? [],
  }));
}

export async function retrieveCampaigns(filters: {
  ids?: string[];
  merchantId?: string;
  withItemCounts?: boolean;
}): Promise<ResolvedCampaign[]> {
  const conditions = [
    filters.ids?.length ? inArray(campaigns.id, filters.ids) : undefined,
    filters.merchantId ? eq(campaigns.merchantId, filters.merchantId) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return [];

  const rows = await db
    .select()
    .from(campaigns)
    .where(and(...conditions));
  if (!filters.withItemCounts) return rows;

  return Promise.all(
    rows.map(async (campaign) => {
      const statusRows = await db
        .select({ status: campaignItems.status, n: count() })
        .from(campaignItems)
        .where(eq(campaignItems.campaignId, campaign.id))
        .groupBy(campaignItems.status);
      const itemCounts = { pending: 0, rendered: 0, failed: 0, skipped: 0 };
      for (const r of statusRows) itemCounts[r.status] = r.n;
      return { ...campaign, itemCounts };
    }),
  );
}

// Temporary: audience sizing queries shoppers/twins/retargetOptins, none of
// which this file owns. Flagged to relocate into actions/shoppers.ts in the
// next pass rather than live here permanently as a 3rd export.
export async function retrieveCampaignAudience(merchantId: string): Promise<ResolvedShopper[]> {
  const rows = await db
    .select({ shopper: shoppers, twinId: twins.id, twinUrl: twins.twinUrl })
    .from(retargetOptins)
    .innerJoin(shoppers, eq(shoppers.id, retargetOptins.shopperId))
    .innerJoin(
      twins,
      and(eq(twins.shopperId, shoppers.id), eq(twins.isDefault, true), eq(twins.status, 'ready')),
    )
    .where(and(eq(retargetOptins.merchantId, merchantId), isNull(retargetOptins.optedOutAt)));
  return rows.map(({ shopper, twinId, twinUrl }) => ({ ...shopper, twinId, twinUrl }));
}
