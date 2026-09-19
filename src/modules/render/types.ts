import { z } from 'zod';
import type { Adapter, Ctx } from '@/lib/adapter';
import type { Result } from '@/lib/result';
import type { GarmentCategory } from '@/modules/scraper/types';
import type { ProviderKey } from '@/config/models';

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

// Section 7.1's interface, adapted: `RenderProvider` mirrors `Adapter`'s
// `key`/`canHandle` shape (kept structurally compatible so a provider could
// still be handed to a generic `AdapterRegistry`) but does NOT implement
// `run()`. Rendering is inherently async/webhook-driven — fal's queue API
// has no synchronous request-response call — so `Adapter.run`'s
// input-in/result-out-of-the-same-call contract doesn't fit and nothing here
// calls it. `submit()` + `parseWebhook()` are the real interface; callers
// use those directly, never `run()`.
export interface RenderProvider extends Omit<
  Adapter<RenderInput, RenderOutput, ProviderKey>,
  'run'
> {
  submit(input: RenderInput, webhookUrl: string, ctx: Ctx): Promise<Result<SubmitResult>>;
  parseWebhook(body: unknown): Result<WebhookResult>;
}

// fal's documented webhook payload shape (docs.fal.ai/model-endpoints/queue,
// verified 2026-09-19): `status: "OK" | "ERROR"`, `payload` present on
// success (model-specific — each provider narrows it further), `error`
// present on failure. `request_id` is fal's job id, used for idempotency.
export const falWebhookEnvelopeSchema = z.object({
  request_id: z.string(),
  gateway_request_id: z.string().optional(),
  status: z.enum(['OK', 'ERROR']),
  payload: z.unknown().optional(),
  error: z.union([z.string(), z.object({ message: z.string() }).passthrough()]).optional(),
});

export type FalWebhookEnvelope = z.infer<typeof falWebhookEnvelopeSchema>;
