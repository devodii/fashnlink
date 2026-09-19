import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { zodResponseFormat } from 'openai/helpers/zod';
import { db } from '@/db';
import { twins } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import { openai } from '@/lib/openai';
import { env } from '@/lib/env';
import { deleteObject } from '@/modules/storage';
import {
  TWIN_BACKGROUND_CLEANUP,
  TWIN_PHOTO_CLASSIFY,
  TWIN_STUDIO_GENERATION,
} from '@/config/prompts';
import { TWIN_CREATIONS_PER_SHOPPER_PER_DAY } from '@/config/limits';
import { consumeRateLimit } from '@/lib/rate-limit';
import { moderateImage } from './moderation';
import { submitNanoBananaEdit } from './providers/nano-banana';

export type CreateTwinInput = {
  shopperId: string;
  selfieKey: string;
  selfieUrl: string;
};

const classifySchema = z.object({
  is_full_body: z.boolean(),
  is_minor_present: z.boolean(),
  confidence: z.number(),
});

async function classifyPhoto(selfieUrl: string): Promise<Result<z.infer<typeof classifySchema>>> {
  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TWIN_PHOTO_CLASSIFY },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: selfieUrl } }] },
      ],
      response_format: zodResponseFormat(classifySchema, 'twin_photo_classify'),
    });
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed)
      return err({ code: 'INTERNAL', message: 'twin photo classification: empty response' });
    return ok(parsed);
  } catch (cause) {
    return err({ code: 'INTERNAL', message: 'twin photo classification failed', cause });
  }
}

export async function createTwin(
  input: CreateTwinInput,
  ctx: Ctx,
): Promise<Result<{ twinId: string }>> {
  const rateLimit = await consumeRateLimit(
    `twin:${input.shopperId}`,
    TWIN_CREATIONS_PER_SHOPPER_PER_DAY,
    24 * 60 * 60,
  );
  if (!rateLimit.allowed) {
    return err({ code: 'RATE_LIMITED', message: 'Too many twin creations today.' });
  }

  const moderation = await moderateImage(input.selfieUrl);
  if (!moderation.ok) {
    await deleteObject(input.selfieKey).catch((cause) =>
      ctx.log.error({ cause }, 'failed to delete moderated-out selfie'),
    );
    return moderation;
  }

  const classification = await classifyPhoto(input.selfieUrl);
  if (!classification.ok) return classification;

  if (classification.value.is_minor_present) {
    await deleteObject(input.selfieKey).catch((cause) =>
      ctx.log.error({ cause }, 'failed to delete minor-flagged selfie'),
    );
    return err({ code: 'MODERATION_BLOCKED', message: 'This photo can’t be used.' });
  }

  const twinId = newId('twin');
  const [existingDefault] = await db
    .select({ id: twins.id })
    .from(twins)
    .where(eq(twins.shopperId, input.shopperId))
    .limit(1);

  await db.insert(twins).values({
    id: twinId,
    shopperId: input.shopperId,
    selfieR2Key: input.selfieKey,
    selfieUrl: input.selfieUrl,
    status: 'pending',
    isDefault: !existingDefault,
  });

  const prompt = classification.value.is_full_body
    ? TWIN_BACKGROUND_CLEANUP
    : TWIN_STUDIO_GENERATION;
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal?secret=${env.FAL_WEBHOOK_SECRET ?? ''}&kind=twin&id=${twinId}`;

  const submission = await submitNanoBananaEdit(prompt, [input.selfieUrl], webhookUrl, ctx);
  if (!submission.ok) {
    await db.update(twins).set({ status: 'failed' }).where(eq(twins.id, twinId));
    return submission;
  }

  await db
    .update(twins)
    .set({ provider: 'nano_banana', providerJobId: submission.value.providerJobId })
    .where(eq(twins.id, twinId));

  return ok({ twinId });
}
