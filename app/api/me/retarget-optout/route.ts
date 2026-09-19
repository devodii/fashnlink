import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { campaigns, campaignItems, retargetOptins } from '@/db/schema';
import { ok } from '@/lib/result';

const bodySchema = z.object({ merchantId: z.string().min(1) });

/**
 * connection; no-op today if `esp_connections` has nothing for this
 * merchant, which is the common case in this sandbox/early merchants.
 */
export const POST = apiHandler({
  name: 'me.retargetOptOut',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;
    const { shopperId } = shopper.value;

    await db
      .update(retargetOptins)
      .set({ optedOutAt: new Date() })
      .where(
        and(
          eq(retargetOptins.shopperId, shopperId),
          eq(retargetOptins.merchantId, body.merchantId),
        ),
      );

    const merchantCampaigns = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(eq(campaigns.merchantId, body.merchantId));

    if (merchantCampaigns.length > 0) {
      await db.delete(campaignItems).where(
        and(
          eq(campaignItems.shopperId, shopperId),
          eq(campaignItems.status, 'pending'),
          inArray(
            campaignItems.campaignId,
            merchantCampaigns.map((c) => c.id),
          ),
        ),
      );
    }

    return ok({ optedOut: true });
  },
});
