import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import { MODEL_IDS, IMAGE_EDIT_TRYON } from '@/constants';
import { submitToFalQueue } from '../fal-queue';
import {
  falWebhookEnvelopeSchema,
  type RenderInput,
  type RenderProvider,
  type SubmitResult,
  type WebhookResult,
} from '../types';

const payloadSchema = z.object({
  images: z.array(z.object({ url: z.string() })).min(1),
});

export async function submitNanoBananaEdit(
  prompt: string,
  imageUrls: string[],
  webhookUrl: string,
  ctx: Ctx,
): Promise<Result<SubmitResult>> {
  return submitToFalQueue(
    MODEL_IDS.nano_banana,
    { prompt, image_urls: imageUrls, num_images: 1, output_format: 'png' },
    webhookUrl,
    ctx,
  );
}

export function parseNanoBananaWebhook(body: unknown): Result<WebhookResult> {
  const envelope = falWebhookEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return err({
      code: 'RENDER_FAILED',
      message: 'invalid fal webhook payload',
      cause: envelope.error,
    });
  }

  if (envelope.data.status === 'ERROR') {
    const message =
      typeof envelope.data.error === 'string'
        ? envelope.data.error
        : (envelope.data.error?.message ?? 'nano_banana render failed');
    return ok({ providerJobId: envelope.data.request_id, status: 'failed', error: message });
  }

  const payload = payloadSchema.safeParse(envelope.data.payload);
  if (!payload.success) {
    return err({
      code: 'RENDER_FAILED',
      message: 'unrecognized nano_banana payload shape',
      cause: payload.error,
    });
  }

  return ok({
    providerJobId: envelope.data.request_id,
    status: 'succeeded',
    imageUrl: payload.data.images[0]?.url,
  });
}

export const nanoBananaProvider: RenderProvider = {
  key: 'nano_banana',
  canHandle: () => true,

  submit(input: RenderInput, webhookUrl: string, ctx: Ctx): Promise<Result<SubmitResult>> {
    return submitNanoBananaEdit(
      IMAGE_EDIT_TRYON,
      [input.twinUrl, input.garmentUrl],
      webhookUrl,
      ctx,
    );
  },

  parseWebhook: parseNanoBananaWebhook,
};
