import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { ok, err } from '@/lib/result';
import { contactChannelSchema } from '@/config/contact-channel';
import { updateMerchants, retrieveMerchants } from '@/actions/merchants';

const bodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  logoUrl: z.string().url().optional(),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']).optional(),
  contactChannel: contactChannelSchema.optional(),
});

export const PATCH = apiHandler({
  name: 'merchants.updateSettings',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, merchant }) => {
    if (body.name) await updateMerchants([merchant.merchantId], { name: body.name });

    const { logoUrl, accentToken, contactChannel } = body;
    if (logoUrl || accentToken || contactChannel) {
      await updateMerchants([merchant.merchantId], {
        settings: {
          ...(logoUrl && { logoUrl }),
          ...(accentToken && { accentToken }),
          ...(contactChannel && { contactChannel }),
        },
      });
    }

    const [updated] = await retrieveMerchants({ ids: [merchant.merchantId] });
    if (!updated) return err({ code: 'INTERNAL', message: 'Merchant not found after update' });
    return ok({ id: updated.id, name: updated.name, settings: updated.settings });
  },
});
