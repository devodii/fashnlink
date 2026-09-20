import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/db';
import { shoppers } from '@/db/schema';
import { childLogger } from '@/lib/log';
import { createFetch } from '@/lib/http';
import { ok } from '@/lib/result';
import { createTwins } from '@/actions/twins';

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
  handler: async ({ body, shopper, requestId }) => {
    const { shopperId } = shopper;

    await db
      .update(shoppers)
      .set({ consentAt: new Date(), ageAttestedAt: new Date() })
      .where(eq(shoppers.id, shopperId));

    const log = childLogger(requestId, { route: 'twins.create', shopperId });
    const ctx = { log, requestId, deadlineMs: Date.now() + 55_000, fetch: createFetch({ log }) };

    const [result] = await createTwins(
      [{ shopperId, selfieKey: body.selfieKey, selfieUrl: body.selfieUrl }],
      ctx,
    );
    if (!result.ok) return result;

    return ok({ twinId: result.value.twinId, status: 'pending' as const });
  },
});
