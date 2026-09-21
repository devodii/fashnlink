import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { ok, err } from '@/lib/result';
import { contactChannelSchema } from '@/constants';
import { updateMerchants, retrieveMerchants, deleteMerchants } from '@/actions/merchants';

const bodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  logoUrl: z.string().url().optional(),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']).optional(),
  contactChannel: contactChannelSchema.optional(),
  referralSource: z.string().min(1).max(120).optional(),
});

export const PATCH = apiHandler({
  name: 'merchants.updateSettings',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, merchant }) => {
    // Independent writes: the name update sets a plain column, the settings
    // update patches the jsonb `settings` column (merging against its own
    // freshly-read row), so the two never touch the same column and can run
    // concurrently; only the re-read below needs both to have landed.
    const writes: Promise<unknown>[] = [];
    if (body.name) writes.push(updateMerchants([merchant.merchantId], { name: body.name }));

    const { logoUrl, accentToken, contactChannel, referralSource } = body;
    if (logoUrl || accentToken || contactChannel || referralSource) {
      writes.push(
        updateMerchants([merchant.merchantId], {
          settings: {
            ...(logoUrl && { logoUrl }),
            ...(accentToken && { accentToken }),
            ...(contactChannel && { contactChannel }),
            ...(referralSource && { referralSource }),
          },
        }),
      );
    }

    await Promise.all(writes);

    const [updated] = await retrieveMerchants({ ids: [merchant.merchantId] });
    if (!updated) return err({ code: 'INTERNAL', message: 'Merchant not found after update' });
    return ok({ id: updated.id, name: updated.name, settings: updated.settings });
  },
});

export const DELETE = apiHandler({
  name: 'merchants.deleteAccount',
  auth: ['merchant_session'],
  handler: async ({ merchant }) => {
    await deleteMerchants([merchant.merchantId]);
    return ok({ deleted: true });
  },
});
