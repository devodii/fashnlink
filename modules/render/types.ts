import { z } from 'zod';
import type { Adapter, Ctx } from '@/lib/adapter';
import type { Result } from '@/lib/result';
import type { GarmentCategory } from '@/db/schema';
import type { ProviderKey } from '@/constants';

export type RenderInput = {
  twinUrl: string;
  garmentUrl: string;
  category: GarmentCategory;
  garmentPhotoType: 'flat-lay' | 'model';
  seed?: number;
};

export type RenderOutput = { imageUrl: string; providerJobId: string; costCents: number };

export type SubmitResult = { providerJobId: string };

export type WebhookResult = {
  providerJobId: string;
  status: 'succeeded' | 'failed';
  imageUrl?: string;
  error?: string;
};

export interface RenderProvider extends Omit<
  Adapter<RenderInput, RenderOutput, ProviderKey>,
  'run'
> {
  submit(input: RenderInput, webhookUrl: string, ctx: Ctx): Promise<Result<SubmitResult>>;
  parseWebhook(body: unknown): Result<WebhookResult>;
}

/**
 * fal's documented webhook payload shape (docs.fal.ai/model-endpoints/queue):
 * `status: "OK" | "ERROR"`, `payload` present on success and narrowed
 * further by each provider, `error` present on failure.
 */
export const falWebhookEnvelopeSchema = z.object({
  request_id: z.string(),
  gateway_request_id: z.string().optional(),
  status: z.enum(['OK', 'ERROR']),
  payload: z.unknown().optional(),
  error: z.union([z.string(), z.object({ message: z.string() }).passthrough()]).nullable().optional(),
});

export type FalWebhookEnvelope = z.infer<typeof falWebhookEnvelopeSchema>;
