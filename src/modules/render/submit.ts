import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import { env } from '@/lib/env';
import { consumeRateLimit } from '@/lib/rate-limit';
import { RENDERS_PER_LINK_SHOPPER_PER_DAY } from '@/config/limits';
import type { GarmentCategory } from '@/modules/scraper/types';
import { reserveRenderCredit, refundFailedRender, type CreateRenderInput } from './credit-ledger';
import { submitWithRouting } from './index';
import type { RenderInput } from './types';

export type SubmitRenderInput = CreateRenderInput & {
  category: GarmentCategory;
  twinUrl: string;
  garmentUrl: string;
  garmentPhotoType: 'flat-lay' | 'model';
};

/**
 * DECISION (same M4 boundary as twin.ts): this is the orchestration a future
 * `POST /api/renders` route will call; rate limit -> reserve
 * credit -> submit to fal -> mark `running` or refund on submission failure.
 * The HTTP route itself isn't built yet (needs the shopper-cookie identity
 * system and the links module from M4 to resolve `linkId`/`shopperId` from a
 * real request), so this function takes them as already-known parameters,
 * same shape `reserveRenderCredit` already does.
 */
export async function submitRender(
  input: SubmitRenderInput,
  ctx: Ctx,
): Promise<Result<{ renderId: string }>> {
  const rateLimit = await consumeRateLimit(
    `render:${input.linkId}:${input.shopperId}`,
    RENDERS_PER_LINK_SHOPPER_PER_DAY,
    24 * 60 * 60,
  );
  if (!rateLimit.allowed) {
    return err({
      code: 'RATE_LIMITED',
      message: "You've reached today's try-on limit for this link.",
    });
  }

  const reservation = await reserveRenderCredit(input);
  if (!reservation.ok) return reservation;

  const { renderId } = reservation.value;
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal?secret=${env.FAL_WEBHOOK_SECRET ?? ''}&kind=render&id=${renderId}`;

  const renderInput: RenderInput = {
    twinUrl: input.twinUrl,
    garmentUrl: input.garmentUrl,
    category: input.category,
    garmentPhotoType: input.garmentPhotoType,
  };

  const submission = await submitWithRouting(input.category, renderInput, webhookUrl, ctx);
  if (!submission.ok) {
    await refundFailedRender(input.merchantId, renderId);
    return submission;
  }

  await db
    .update(renders)
    .set({
      provider: submission.value.provider,
      providerJobId: submission.value.providerJobId,
      status: 'running',
    })
    .where(eq(renders.id, renderId));

  return ok({ renderId });
}
