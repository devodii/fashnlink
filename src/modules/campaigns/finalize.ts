import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, campaigns, merchants, products, renders, shoppers } from '@/db/schema';
import { countCampaignItemsByStatus } from '@/db/repos/campaigns';
import { releaseCredits } from '@/modules/render/credit-ledger';
import { pushToMerchantEsp } from '@/modules/esp';
import { sendEmail } from '@/lib/email';
import { childLogger } from '@/lib/log';
import { DROP_FAILURE_PAUSE_MIN_SAMPLE, DROP_FAILURE_PAUSE_RATE } from '@/config/limits';

const log = childLogger('campaigns.finalize');

export async function checkCampaignHealth(campaignId: string): Promise<void> {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign || campaign.status === 'cancelled' || campaign.status === 'ready') return;

  const counts = await countCampaignItemsByStatus(campaignId);
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

  for (const [shopperId, items] of byShopper) {
    const [shopper] = await db
      .select({ email: shoppers.email })
      .from(shoppers)
      .where(eq(shoppers.id, shopperId))
      .limit(1);
    if (!shopper?.email) continue;

    const looks = [];
    for (const item of items) {
      if (!item.renderId) continue;
      const [render] = await db
        .select({ outputUrl: renders.outputUrl })
        .from(renders)
        .where(eq(renders.id, item.renderId))
        .limit(1);
      const [product] = await db
        .select({ title: products.title, buyUrl: products.buyUrl })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      if (!render?.outputUrl || !product) continue;
      looks.push({
        product_title: product.title,
        buy_url: product.buyUrl,
        render_image_url: render.outputUrl,
      });
    }
    if (looks.length === 0) continue;

    const pushResult = await pushToMerchantEsp(
      merchantId,
      { op: 'event', email: shopper.email, eventName: 'Tryon New Drop', properties: { looks } },
      {
        log,
        requestId: `campaign-finalize-${campaignId}`,
        deadlineMs: Date.now() + 30_000,
        fetch: globalThis.fetch,
      },
    );

    if (pushResult.ok) {
      await db
        .update(campaignItems)
        .set({ deliveredAt: new Date() })
        .where(
          and(
            eq(campaignItems.campaignId, campaignId),
            eq(campaignItems.shopperId, shopperId),
            eq(campaignItems.status, 'rendered'),
          ),
        );
    } else {
      log.warn({ cause: pushResult.error, shopperId, campaignId }, 'drop esp push failed');
    }
  }

  await db
    .update(campaigns)
    .set({ status: 'ready', syncedAt: new Date() })
    .where(eq(campaigns.id, campaignId));
}
