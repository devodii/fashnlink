import 'server-only';
import { z } from 'zod';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { zodResponseFormat } from 'openai/helpers/zod';
import { db } from '@/db';
import { twins } from '@/db/schema';
import type { Twin } from '@/db/schema';
import { newId } from '@/lib/ids';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import { openai } from '@/lib/openai';
import { env, publicUrl } from '@/lib/env';
import { childLogger } from '@/lib/log';
import { deleteObjects } from '@/modules/storage';
import {
  TWIN_BACKGROUND_CLEANUP,
  TWIN_PHOTO_CLASSIFY,
  TWIN_STUDIO_GENERATION,
  TWIN_CREATIONS_PER_SHOPPER_PER_DAY,
} from '@/constants';
import { consumeRateLimit } from '@/lib/rate-limit';
import { moderateImage } from '@/modules/render/moderation';
import { submitNanoBananaEdit } from '@/modules/render/providers/nano-banana';

const log = childLogger('actions.twins');

const classifySchema = z.object({
  is_full_body: z.boolean(),
  is_minor_present: z.boolean(),
  confidence: z.number(),
});

type CreateTwinInput = Pick<Twin, 'shopperId' | 'selfieUrl'> & { selfieKey: string };

export async function createTwins(
  inputs: CreateTwinInput[],
  ctx: Ctx,
): Promise<Result<{ twinId: string }>[]> {
  return Promise.all(
    inputs.map(async (input): Promise<Result<{ twinId: string }>> => {
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
        await deleteObjects([input.selfieKey]).catch((cause) =>
          ctx.log.error({ cause }, 'failed to delete moderated-out selfie'),
        );
        return moderation;
      }

      let classification: Result<z.infer<typeof classifySchema>>;
      try {
        const completion = await openai.chat.completions.parse({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: TWIN_PHOTO_CLASSIFY },
            { role: 'user', content: [{ type: 'image_url', image_url: { url: input.selfieUrl } }] },
          ],
          response_format: zodResponseFormat(classifySchema, 'twin_photo_classify'),
        });
        const parsed = completion.choices[0]?.message.parsed;
        classification = parsed
          ? ok(parsed)
          : err({ code: 'INTERNAL', message: 'twin photo classification: empty response' });
      } catch (cause) {
        classification = err({
          code: 'INTERNAL',
          message: 'twin photo classification failed',
          cause,
        });
      }
      if (!classification.ok) return classification;

      if (classification.value.is_minor_present) {
        await deleteObjects([input.selfieKey]).catch((cause) =>
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
      const webhookUrl = `${publicUrl}/api/webhooks/fal?secret=${env.FAL_WEBHOOK_SECRET}&kind=twin&id=${twinId}`;

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
    }),
  );
}

export async function retrieveTwins(filters: {
  ids?: string[];
  shopperIds?: string[];
  isDefault?: boolean;
}): Promise<Twin[]> {
  const conditions = [
    filters.ids?.length ? inArray(twins.id, filters.ids) : undefined,
    filters.shopperIds?.length ? inArray(twins.shopperId, filters.shopperIds) : undefined,
    filters.isDefault !== undefined ? eq(twins.isDefault, filters.isDefault) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return [];

  return db
    .select()
    .from(twins)
    .where(and(...conditions))
    .orderBy(desc(twins.createdAt));
}

export async function updateTwins(
  ids: string[],
  patch: Partial<
    Pick<Twin, 'status' | 'provider' | 'providerJobId' | 'twinUrl' | 'twinR2Key' | 'isDefault'>
  >,
): Promise<Twin[]> {
  if (ids.length === 0 || Object.keys(patch).length === 0) return [];
  return db.update(twins).set(patch).where(inArray(twins.id, ids)).returning();
}

export async function deleteTwins(filters: {
  ids?: string[];
  shopperIds?: string[];
}): Promise<{ deletedCount: number }> {
  const conditions = [
    filters.ids?.length ? inArray(twins.id, filters.ids) : undefined,
    filters.shopperIds?.length ? inArray(twins.shopperId, filters.shopperIds) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (conditions.length === 0) return { deletedCount: 0 };

  const rows = await db
    .select()
    .from(twins)
    .where(and(...conditions));
  if (rows.length === 0) return { deletedCount: 0 };

  const keys = rows
    .flatMap((row) => [row.selfieR2Key, row.twinR2Key])
    .filter((key): key is string => Boolean(key));
  if (keys.length > 0) {
    await deleteObjects(keys).catch((cause) =>
      log.error({ cause }, 'failed to delete twin objects'),
    );
  }

  await db.delete(twins).where(
    inArray(
      twins.id,
      rows.map((row) => row.id),
    ),
  );
  return { deletedCount: rows.length };
}
