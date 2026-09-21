import 'server-only';

import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, campaigns, merchants, products, renders } from '@/db/schema';
import type { Campaign, ResolvedCampaign } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';
import { childLogger } from '@/lib/log';
import { retrieveShoppers } from '@/actions/shoppers';
import { retrieveProducts } from '@/actions/products';
import { releaseCredits, reserveCredits } from '@/modules/render/credit-ledger';
import { pushToMerchantEsp } from '@/modules/esp';
import { enqueueJobs } from '@/modules/jobs';
import { sendEmail } from '@/lib/email';
import {
  DROP_FAILURE_PAUSE_MIN_SAMPLE,
  DROP_FAILURE_PAUSE_RATE,
  MAX_DROP_ITEMS,
  MAX_DROP_PRODUCTS,
} from '@/constants';

const log = childLogger('actions.campaigns');

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

// ------------------------------ DROPS ------------------------------

export type DropEstimate = {
  eligibleProductIds: string[];
  audienceCount: number;
  itemCount: number;
  estimatedCredits: number;
};

export async function estimateDrop(
  merchantId: string,
  productIds: string[],
): Promise<Result<DropEstimate>> {
  if (productIds.length === 0 || productIds.length > MAX_DROP_PRODUCTS) {
    return err({ code: 'INVALID_INPUT', message: `pick 1-${MAX_DROP_PRODUCTS} products` });
  }

  // Read-only and independent: eligibility keys off `productIds`, audience
  // off `merchantId`; the eligibility check below just runs after both land.
  const [eligible, audience] = await Promise.all([
    retrieveProducts({ merchantId, ids: productIds, eligibleOnly: true }),
    retrieveShoppers({ retargetOptedInMerchantId: merchantId }),
  ]);
  if (eligible.length !== productIds.length) {
    return err({ code: 'INVALID_INPUT', message: 'one or more products are not eligible' });
  }

  const itemCount = audience.length * eligible.length;

  return ok({
    eligibleProductIds: eligible.map((p) => p.id),
    audienceCount: audience.length,
    itemCount,
    estimatedCredits: itemCount,
  });
}

export async function createDrop(
  merchantId: string,
  productIds: string[],
): Promise<Result<{ campaignId: string; itemCount: number }>> {
  const estimate = await estimateDrop(merchantId, productIds);
  if (!estimate.ok) return estimate;

  if (estimate.value.itemCount === 0) {
    return err({ code: 'INVALID_INPUT', message: 'no opted-in shoppers with a ready twin yet' });
  }
  if (estimate.value.itemCount > MAX_DROP_ITEMS) {
    return err({
      code: 'INVALID_INPUT',
      message: `this drop would create ${estimate.value.itemCount} items, over the ${MAX_DROP_ITEMS} cap; pick fewer products`,
    });
  }

  const reservation = await reserveCredits(merchantId, estimate.value.estimatedCredits);
  if (!reservation.ok) return reservation;

  const audience = await retrieveShoppers({ retargetOptedInMerchantId: merchantId });
  const items = audience.flatMap((shopper) =>
    estimate.value.eligibleProductIds.map((productId) => ({
      shopperId: shopper.id,
      productId,
    })),
  );

  const [{ id: campaignId, itemIds }] = await createCampaigns([
    {
      merchantId,
      productIds: estimate.value.eligibleProductIds,
      audienceCount: estimate.value.audienceCount,
      estimatedCredits: estimate.value.estimatedCredits,
      items,
    },
  ]);

  await enqueueJobs(
    itemIds.map((itemId) => ({ type: 'campaign.renderItem', payload: { campaignItemId: itemId } })),
  );

  return ok({ campaignId, itemCount: itemIds.length });
}

// ------------------------------ HEALTH ------------------------------

export async function checkCampaignHealth(campaignId: string): Promise<void> {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign || campaign.status === 'cancelled' || campaign.status === 'ready') return;

  const [withCounts] = await retrieveCampaigns({ ids: [campaignId], withItemCounts: true });
  const counts = withCounts?.itemCounts ?? { pending: 0, rendered: 0, failed: 0, skipped: 0 };
  const resolved = counts.rendered + counts.failed + counts.skipped;
  const total = counts.pending + resolved;
  if (total === 0) return;

  const failureRate = resolved > 0 ? (counts.failed + counts.skipped) / resolved : 0;
  if (
    resolved >= DROP_FAILURE_PAUSE_MIN_SAMPLE &&
    failureRate > DROP_FAILURE_PAUSE_RATE &&
    counts.pending > 0
  ) {
    await pauseCampaign(campaignId, campaign.merchantId, failureRate);
    return;
  }

  if (counts.pending === 0) {
    await finalizeCampaign(campaignId, campaign.merchantId, counts.failed + counts.skipped);
  }
}

async function pauseCampaign(
  campaignId: string,
  merchantId: string,
  failureRate: number,
): Promise<void> {
  // The campaign_status enum has no dedicated "paused" value; cancelled
  // doubles as paused here and stops render-item.ts from processing more
  // items for this campaign.
  const pendingItems = await db
    .select({ id: campaignItems.id })
    .from(campaignItems)
    .where(and(eq(campaignItems.campaignId, campaignId), eq(campaignItems.status, 'pending')));

  if (pendingItems.length > 0) {
    await db
      .update(campaignItems)
      .set({ status: 'skipped', skipReason: 'campaign paused: failure rate exceeded 20%' })
      .where(and(eq(campaignItems.campaignId, campaignId), eq(campaignItems.status, 'pending')));
    await releaseCredits(merchantId, pendingItems.length);
  }

  await db.update(campaigns).set({ status: 'cancelled' }).where(eq(campaigns.id, campaignId));

  const [merchant] = await db
    .select({ email: merchants.email })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);
  if (merchant?.email) {
    await sendEmail(
      merchant.email,
      'Your drop campaign was paused',
      `<p>Your new drop campaign hit a ${Math.round(failureRate * 100)}% failure rate and was paused to avoid wasting credits. Unused credits for the remaining items have been returned to your balance.</p>`,
    ).catch((cause) => log.warn({ cause, campaignId }, 'failed to send campaign-paused email'));
  }
}

async function finalizeCampaign(
  campaignId: string,
  merchantId: string,
  unusedItemCount: number,
): Promise<void> {
  if (unusedItemCount > 0) {
    await releaseCredits(merchantId, unusedItemCount);
  }

  const renderedItems = await db
    .select({
      shopperId: campaignItems.shopperId,
      renderId: campaignItems.renderId,
      productId: campaignItems.productId,
    })
    .from(campaignItems)
    .where(and(eq(campaignItems.campaignId, campaignId), eq(campaignItems.status, 'rendered')));

  const byShopper = new Map<string, typeof renderedItems>();
  for (const item of renderedItems) {
    const list = byShopper.get(item.shopperId) ?? [];
    list.push(item);
    byShopper.set(item.shopperId, list);
  }

  // The lookups below were previously done per shopper (and per item, for
  // renders/products) inside the loop, one round-trip each; batched into
  // three queries up front and joined in memory instead.
  const shopperIds = [...byShopper.keys()];
  const renderIds = renderedItems.map((item) => item.renderId).filter((id): id is string => !!id);
  const productIds = [...new Set(renderedItems.map((item) => item.productId))];

  const [shopperRows, renderRows, productRows] = await Promise.all([
    shopperIds.length > 0 ? retrieveShoppers({ ids: shopperIds }) : [],
    renderIds.length > 0
      ? db
          .select({ id: renders.id, outputUrl: renders.outputUrl })
          .from(renders)
          .where(inArray(renders.id, renderIds))
      : [],
    productIds.length > 0
      ? db
          .select({ id: products.id, title: products.title, buyUrl: products.buyUrl })
          .from(products)
          .where(inArray(products.id, productIds))
      : [],
  ]);

  const emailByShopper = new Map(shopperRows.map((s) => [s.id, s.email]));
  const outputUrlByRender = new Map(renderRows.map((r) => [r.id, r.outputUrl]));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  // Each shopper gets a distinct ESP payload (their own "looks"), so this
  // push genuinely has to happen per shopper; only the DB writes around it
  // are deferred and batched.
  const deliveredShopperIds: string[] = [];

  for (const [shopperId, items] of byShopper) {
    const email = emailByShopper.get(shopperId);
    if (!email) continue;

    const looks = [];
    for (const item of items) {
      if (!item.renderId) continue;
      const outputUrl = outputUrlByRender.get(item.renderId);
      const product = productById.get(item.productId);
      if (!outputUrl || !product) continue;
      looks.push({
        product_title: product.title,
        buy_url: product.buyUrl,
        render_image_url: outputUrl,
      });
    }
    if (looks.length === 0) continue;

    const pushResult = await pushToMerchantEsp(
      merchantId,
      { op: 'event', email, eventName: 'Tryon New Drop', properties: { looks } },
      {
        log,
        requestId: `campaign-finalize-${campaignId}`,
        deadlineMs: Date.now() + 30_000,
        fetch: globalThis.fetch,
      },
    );

    if (pushResult.ok) {
      deliveredShopperIds.push(shopperId);
    } else {
      log.warn({ cause: pushResult.error, shopperId, campaignId }, 'drop esp push failed');
    }
  }

  if (deliveredShopperIds.length > 0) {
    await db
      .update(campaignItems)
      .set({ deliveredAt: new Date() })
      .where(
        and(
          eq(campaignItems.campaignId, campaignId),
          inArray(campaignItems.shopperId, deliveredShopperIds),
          eq(campaignItems.status, 'rendered'),
        ),
      );
  }

  await db
    .update(campaigns)
    .set({ status: 'ready', syncedAt: new Date() })
    .where(eq(campaigns.id, campaignId));
}
