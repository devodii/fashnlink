import { z } from 'zod';
import { apiHandler, requireMerchantSession } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { recordFreeTextPlatformRequest } from '@/db/repos/platform-requests';

const bodySchema = z.object({ notes: z.string().min(1).max(500) });

// Onboarding step 1's "Something else" chip (section 8.1) — free text, no
// URL, into the scraper backlog (`platform_requests.notes`).
export const POST = apiHandler({
  name: 'platformRequests.createFreeText',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth }) => {
    const merchant = requireMerchantSession(auth);
    if (!merchant.ok) return merchant;

    await recordFreeTextPlatformRequest({
      merchantId: merchant.value.merchantId,
      notes: body.notes,
    });
    return ok({ recorded: true });
  },
});
