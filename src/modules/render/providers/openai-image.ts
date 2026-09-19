import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import { MODEL_IDS } from '@/config/models';
import { IMAGE_EDIT_TRYON } from '@/config/prompts';
import { openai } from '@/lib/openai';
import type { RenderInput, RenderProvider, SubmitResult, WebhookResult } from '../types';

/**
 * OpenAI's images API (`client.images.edit`) is synchronous: it returns the
 * finished image in the same response, unlike fal's async queue-plus-webhook
 * model the other providers use. To reuse the existing webhook-driven
 * "download image, store it, mark the row ready" flow without duplicating
 * it, `submit` runs the edit call itself and then posts the result straight
 * to `webhookUrl` as soon as it has it, mimicking what a real webhook
 * delivery would send. A failed edit call returns an error from `submit`
 * directly instead, so `submitWithRouting`'s existing retry-next-provider
 * behavior applies without needing a fake webhook round trip for failures.
 */
const webhookPayloadSchema = z.object({
  providerJobId: z.string(),
  status: z.enum(['succeeded', 'failed']),
  imageUrl: z.string().optional(),
  error: z.string().optional(),
});

export async function submitOpenaiEdit(
  prompt: string,
  imageUrls: string[],
  webhookUrl: string,
  ctx: Ctx,
): Promise<Result<SubmitResult>> {
  const providerJobId = randomUUID();

  try {
    const images = await Promise.all(imageUrls.map((url) => ctx.fetch(url)));

    const response = await openai.images.edit({
      image: images,
      prompt,
      model: MODEL_IDS.openai_image,
      n: 1,
      output_format: 'png',
      input_fidelity: 'high',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return err({ code: 'RENDER_FAILED', message: 'openai image edit returned no image data' });
    }

    // GPT image models only return base64, never a URL (unlike dall-e-2/3),
    // so the result is passed on as a data URI the webhook route can fetch
    // exactly like any other provider's imageUrl.
    const imageUrl = `data:image/png;base64,${b64}`;

    const webhookResponse = await ctx.fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerJobId, status: 'succeeded', imageUrl }),
    });
    if (!webhookResponse.ok) {
      return err({
        code: 'RENDER_FAILED',
        message: `openai image edit result post to webhook failed (${webhookResponse.status})`,
      });
    }

    return ok({ providerJobId });
  } catch (cause) {
    ctx.log.error({ cause }, 'openai image edit failed');
    return err({ code: 'RENDER_FAILED', message: 'openai image edit failed', cause });
  }
}

export function parseOpenaiWebhook(body: unknown): Result<WebhookResult> {
  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return err({
      code: 'RENDER_FAILED',
      message: 'invalid openai_image webhook payload',
      cause: parsed.error,
    });
  }
  return ok(parsed.data);
}

export const openaiImageProvider: RenderProvider = {
  key: 'openai_image',
  canHandle: () => true,

  submit(input: RenderInput, webhookUrl: string, ctx: Ctx): Promise<Result<SubmitResult>> {
    return submitOpenaiEdit(IMAGE_EDIT_TRYON, [input.twinUrl, input.garmentUrl], webhookUrl, ctx);
  },

  parseWebhook: parseOpenaiWebhook,
};
