import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { ok } from '@/lib/result';
import { createPlatformRequests } from '@/actions/platform-requests';
import { ensureTrackingStore } from '@/actions/stores';
import { publicUrl } from '@/lib/env';

const bodySchema = z.object({ notes: z.string().min(1).max(500) });

export const POST = apiHandler({
  name: 'platformRequests.createFreeText',
  auth: ['merchant_session'],
  schema: { body: bodySchema },
  handler: async ({ body, merchant }) => {
    const [, store] = await Promise.all([
      createPlatformRequests([
        { kind: 'freetext', merchantId: merchant.merchantId, notes: body.notes },
      ]),
      ensureTrackingStore(merchant.merchantId),
    ]);
    return ok({
      recorded: true,
      trackingScriptSrc: `${publicUrl}/api/track.js?s=${store.trackingToken}`,
    });
  },
});
