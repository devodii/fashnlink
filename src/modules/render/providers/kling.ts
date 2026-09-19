import { z } from 'zod';
import { err, ok, type Result } from '@/lib/result';
import type { Ctx } from '@/lib/adapter';
import { MODEL_IDS } from '@/config/models';
import { submitToFalQueue } from '../fal-queue';
import {
  falWebhookEnvelopeSchema,
  type RenderInput,
  type RenderProvider,
  type SubmitResult,
  type WebhookResult,
} from '../types';

const payloadSchema = z.object({
  image: z.object({ url: z.string() }),
});

export const klingProvider: RenderProvider = {
  key: 'kling',
  canHandle: () => true,

  async submit(input: RenderInput, webhookUrl: string, ctx: Ctx): Promise<Result<SubmitResult>> {
    return submitToFalQueue(
      MODEL_IDS.kling,
      { human_image_url: input.twinUrl, garment_image_url: input.garmentUrl },
      webhookUrl,
      ctx,
    );
  },

  parseWebhook(body: unknown): Result<WebhookResult> {
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
          : (envelope.data.error?.message ?? 'kling render failed');
      return ok({ providerJobId: envelope.data.request_id, status: 'failed', error: message });
    }

    const payload = payloadSchema.safeParse(envelope.data.payload);
    if (!payload.success) {
      return err({
        code: 'RENDER_FAILED',
        message: 'unrecognized kling payload shape',
        cause: payload.error,
      });
    }

    return ok({
      providerJobId: envelope.data.request_id,
      status: 'succeeded',
      imageUrl: payload.data.image.url,
    });
  },
};
