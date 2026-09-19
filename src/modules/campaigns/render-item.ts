import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, campaigns, productImages, products, renders, twins } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';
import { registerJobHandler } from '@/modules/jobs/registry';
import { submitWithRouting } from '@/modules/render';
import type { RenderInput } from '@/modules/render/types';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { env } from '@/lib/env';
import { checkCampaignHealth } from './finalize';

const payloadSchema = z.object({ campaignItemId: z.string() });

async function skipItem(itemId: string, reason: string): Promise<void> {
  await db
    .update(campaignItems)
    .set({ status: 'skipped', skipReason: reason })
    .where(eq(campaignItems.id, itemId));
}

/**
 * one `campaign.renderItem` job per campaign_items row, drained
 * through the same `jobs` table/loop as every other job type (M1's
 * `cron/jobs`, M6's `store.crawled`). DECISION: this is deliberately NOT a
 * separate priority queue; "priority below live shopper renders" is
 * satisfied simply by these jobs competing for the same drain batch as
 * everything else rather than getting their own faster-polled lane, which
 * is the simplest correct v1 reading, not true scheduling priority.
 *
 * Unlike a normal shopper render (`submitRender`, credit-ledger.ts), this
 * does NOT call `reserveRenderCredit`; the whole campaign's credits were
 * already reserved in bulk when the drop was confirmed (`createDrop`).
 * Deducting again here would double-charge the merchant.
 */
registerJobHandler('campaign.renderItem', async (payload): Promise<Result<void>> => {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return err({ code: 'INVALID_INPUT', message: 'invalid campaign.renderItem payload' });
  }
  const { campaignItemId } = parsed.data;

  const [item] = await db
    .select()
    .from(campaignItems)
    .where(eq(campaignItems.id, campaignItemId))
    .limit(1);
  if (!item) return err({ code: 'NOT_FOUND', message: 'campaign item not found' });
  if (item.status !== 'pending') return ok(undefined); // already resolved, nothing to do

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, item.campaignId))
    .limit(1);
  if (!campaign || campaign.status === 'cancelled') {
    await skipItem(item.id, 'campaign cancelled');
    await checkCampaignHealth(item.campaignId);
    return ok(undefined);
  }

  const [twin] = await db
    .select({ id: twins.id, status: twins.status, twinUrl: twins.twinUrl })
    .from(twins)
    .where(and(eq(twins.shopperId, item.shopperId), eq(twins.isDefault, true)))
    .limit(1);
  if (!twin || twin.status !== 'ready' || !twin.twinUrl) {
    await skipItem(item.id, 'shopper twin no longer ready');
    await checkCampaignHealth(item.campaignId);
    return ok(undefined);
  }

  const [product] = await db
    .select({
      garmentCategory: products.garmentCategory,
      eligibility: products.eligibility,
    })
    .from(products)
    .where(eq(products.id, item.productId))
    .limit(1);
  if (!product || product.eligibility !== 'eligible') {
    await skipItem(item.id, 'product no longer eligible');
    await checkCampaignHealth(item.campaignId);
    return ok(undefined);
  }

  const [tryonImage] = await db
    .select({ url: productImages.url, role: productImages.role })
    .from(productImages)
    .where(and(eq(productImages.productId, item.productId), eq(productImages.isTryonSource, true)))
    .limit(1);
  if (!tryonImage) {
    await skipItem(item.id, 'product has no usable try-on image');
    await checkCampaignHealth(item.campaignId);
    return ok(undefined);
  }

  const log = childLogger('campaign-render-item', { campaignItemId: item.id });
  const ctx = {
    log,
    requestId: 'campaign-render-item',
    deadlineMs: Date.now() + 55_000,
    fetch: createFetch({ log }),
  };

  const renderId = newId('render');
  await db.insert(renders).values({
    id: renderId,
    linkId: null,
    productId: item.productId,
    shopperId: item.shopperId,
    twinId: twin.id,
    status: 'queued',
    via: 'campaign',
  });

  const garmentPhotoType =
    tryonImage.role === 'flat_lay' ? ('flat-lay' as const) : ('model' as const);
  const renderInput: RenderInput = {
    twinUrl: twin.twinUrl,
    garmentUrl: tryonImage.url,
    category: product.garmentCategory,
    garmentPhotoType,
  };
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal?secret=${env.FAL_WEBHOOK_SECRET ?? ''}&kind=render&id=${renderId}`;

  const submission = await submitWithRouting(product.garmentCategory, renderInput, webhookUrl, ctx);
  if (!submission.ok) {
    await db
      .update(renders)
      .set({ status: 'failed', error: { message: submission.error.message } })
      .where(eq(renders.id, renderId));
    await db
      .update(campaignItems)
      .set({ status: 'failed', skipReason: submission.error.message, renderId })
      .where(eq(campaignItems.id, item.id));
    await checkCampaignHealth(item.campaignId);
    return ok(undefined); // a submission failure is a business outcome (recorded), not a job failure to retry
  }

  await db
    .update(renders)
    .set({
      provider: submission.value.provider,
      providerJobId: submission.value.providerJobId,
      status: 'running',
    })
    .where(eq(renders.id, renderId));
  await db.update(campaignItems).set({ renderId }).where(eq(campaignItems.id, item.id));

  return ok(undefined);
});
