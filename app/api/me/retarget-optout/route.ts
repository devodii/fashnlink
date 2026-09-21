import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { campaigns, campaignItems } from '@/db/schema';
import { ok } from '@/lib/result';
import { updateRetargetOptins } from '@/actions/retarget-optins';

const bodySchema = z.object({ merchantId: z.string().min(1) });

export const POST = apiHandler({
  name: 'me.retargetOptOut',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, shopper }) => {
    const { shopperId } = shopper;

    await updateRetargetOptins([{ shopperId, merchantId: body.merchantId }], {
      optedOutAt: new Date(),
    });

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
