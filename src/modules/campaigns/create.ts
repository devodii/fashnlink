import { err, ok, type Result } from '@/lib/result';
import { reserveCredits } from '@/modules/render/credit-ledger';
import { enqueueJobs } from '@/modules/jobs';
import { MAX_DROP_ITEMS, MAX_DROP_PRODUCTS } from '@/config/limits';
import { createCampaigns, retrieveCampaignAudience } from '@/actions/campaigns';
import { retrieveProducts } from '@/actions/products';

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

  const eligible = await retrieveProducts({ merchantId, ids: productIds, eligibleOnly: true });
  if (eligible.length !== productIds.length) {
    return err({ code: 'INVALID_INPUT', message: 'one or more products are not eligible' });
  }

  const audience = await retrieveCampaignAudience(merchantId);
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

  const audience = await retrieveCampaignAudience(merchantId);
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
