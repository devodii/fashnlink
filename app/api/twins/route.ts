import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler, requireShopperSession } from '@/lib/api-handler';
import { db } from '@/db';
import { shoppers } from '@/db/schema';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { ok } from '@/lib/result';
import { createTwin } from '@/modules/render/twin';

const bodySchema = z.object({
  selfieKey: z.string().min(1),
  selfieUrl: z.string().url(),
  consent: z.literal(true),
  ageAttested: z.literal(true),
});

export const POST = apiHandler({
  name: 'twins.create',
  auth: ['shopper_session'],
  schema: { body: bodySchema },
  handler: async ({ body, auth, requestId }) => {
    const shopper = requireShopperSession(auth);
    if (!shopper.ok) return shopper;
    const { shopperId } = shopper.value;

    await db
      .update(shoppers)
      .set({ consentAt: new Date(), ageAttestedAt: new Date() })
      .where(eq(shoppers.id, shopperId));

    const log = childLogger(requestId, { route: 'twins.create', shopperId });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    const result = await createTwin(
      { shopperId, selfieKey: body.selfieKey, selfieUrl: body.selfieUrl },
      ctx,
    );
    if (!result.ok) return result;

    return ok({ twinId: result.value.twinId, status: 'pending' as const });
  },
});
