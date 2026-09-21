import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignItems, campaigns, productImages, products, renders } from '@/db/schema';
import { retrieveTwins } from '@/actions/twins';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';
import { defineJobHandler } from '@/modules/jobs/registry';
import { submitWithRouting } from '@/modules/render';
import type { RenderInput } from '@/modules/render/types';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { env, publicUrl } from '@/lib/env';
import { checkCampaignHealth } from '@/actions/campaigns';

const payloadSchema = z.object({ campaignItemId: z.string() });
type CampaignRenderItemPayload = z.infer<typeof payloadSchema>;

async function skipItem(itemId: string, reason: string): Promise<void> {
  await db
    .update(campaignItems)
    .set({ status: 'skipped', skipReason: reason })
    .where(eq(campaignItems.id, itemId));
}

// Does not call reserveRenderCredit: the whole campaign's credits were
// already reserved in bulk in createDrop, so deducting again here would
// double-charge the merchant.
defineJobHandler<CampaignRenderItemPayload>(
  'campaign.renderItem',
  async (payload): Promise<Result<void>> => {
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
    if (item.status !== 'pending') return ok(undefined);

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

    const [twin] = await retrieveTwins({ shopperIds: [item.shopperId], isDefault: true });
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
      .where(
        and(eq(productImages.productId, item.productId), eq(productImages.isTryonSource, true)),
      )
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
    const webhookUrl = `${publicUrl}/api/webhooks/fal?secret=${env.FAL_WEBHOOK_SECRET ?? ''}&kind=render&id=${renderId}`;

    const submission = await submitWithRouting(
      product.garmentCategory,
      renderInput,
      webhookUrl,
      ctx,
      async (provider) => {
        await db
          .update(renders)
          .set({ provider, status: 'running' })
          .where(eq(renders.id, renderId));
      },
    );
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
      // Recorded as a business outcome, not a job failure to retry.
      return ok(undefined);
    }

    await db
      .update(renders)
      .set({ providerJobId: submission.value.providerJobId })
      .where(eq(renders.id, renderId));
    await db.update(campaignItems).set({ renderId }).where(eq(campaignItems.id, item.id));

    return ok(undefined);
  },
);
