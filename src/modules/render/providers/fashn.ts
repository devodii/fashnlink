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

/**
 * Category mapping verified against fal's own FASHN v1.6 API docs
 * (fal.ai/models/fal-ai/fashn/tryon/v1.6/api, 2026-09-19): the model's
 * `category` enum is `tops | bottoms | one-pieces | auto`, not the app's own
 * `GarmentCategory` union; this adapter is the one place that translation
 * happens.
 */
const CATEGORY_MAP: Record<string, 'tops' | 'bottoms' | 'one-pieces' | 'auto'> = {
  top: 'tops',
  bottom: 'bottoms',
  one_piece: 'one-pieces',
  outerwear: 'tops',
};

const payloadSchema = z.object({
  images: z.array(z.object({ url: z.string() })).min(1),
});

export const fashnProvider: RenderProvider = {
  key: 'fashn',
  canHandle: () => true,

  async submit(input: RenderInput, webhookUrl: string, ctx: Ctx): Promise<Result<SubmitResult>> {
    return submitToFalQueue(
      MODEL_IDS.fashn,
      {
        model_image: input.twinUrl,
        garment_image: input.garmentUrl,
        category: CATEGORY_MAP[input.category] ?? 'auto',
        garment_photo_type: input.garmentPhotoType === 'flat-lay' ? 'flat-lay' : 'model',
        mode: 'balanced',
        num_samples: 1,
        ...(input.seed !== undefined ? { seed: input.seed } : {}),
      },
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
          : (envelope.data.error?.message ?? 'fashn render failed');
      return ok({ providerJobId: envelope.data.request_id, status: 'failed', error: message });
    }

    const payload = payloadSchema.safeParse(envelope.data.payload);
    if (!payload.success) {
      return err({
        code: 'RENDER_FAILED',
        message: 'unrecognized fashn payload shape',
        cause: payload.error,
      });
    }

    return ok({
      providerJobId: envelope.data.request_id,
      status: 'succeeded',
      imageUrl: payload.data.images[0]?.url,
    });
  },
};
