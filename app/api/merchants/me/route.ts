import { z } from 'zod';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { ok, err } from '@/lib/result';
import {
  updateMerchantBrand,
  updateMerchantSettings,
  findMerchantById,
} from '@/db/repos/merchants';

const bodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  logoUrl: z.string().url().optional(),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']).optional(),
  contactChannel: z
    .object({
      type: z.enum(['whatsapp', 'instagram', 'email']),
      value: z.string().min(1),
    })
    .optional(),
});

// Shared by onboarding step 2 and `/dashboard/settings` (section 8.1/8.2) —
// one form, one route, matching the M5 directive's "reuse the same form,
// don't duplicate" instruction.
export const PATCH = apiHandler({
  name: 'merchants.updateSettings',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    if (body.name) await updateMerchantBrand(merchant.value.merchantId, body.name);

    const { logoUrl, accentToken, contactChannel } = body;
    if (logoUrl || accentToken || contactChannel) {
      await updateMerchantSettings(merchant.value.merchantId, {
        ...(logoUrl && { logoUrl }),
        ...(accentToken && { accentToken }),
        ...(contactChannel && { contactChannel }),
      });
    }

    const updated = await findMerchantById(merchant.value.merchantId);
    if (!updated) return err({ code: 'INTERNAL', message: 'Merchant not found after update' });
    return ok({ id: updated.id, name: updated.name, settings: updated.settings });
  },
});
