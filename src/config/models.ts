import type { GarmentCategory } from '@/db/schema';

/**
 * Render providers, invoked through fal's queue API
 * (https://queue.fal.run/{modelId}) for fashn and nano_banana, and directly
 * through OpenAI's synchronous images API for openai_image. Model ids
 * verified against each provider's live docs on 2026-09-19, not guessed:
 * https://fal.ai/models/fal-ai/fashn/tryon/v1.6/api
 * https://fal.ai/models/fal-ai/nano-banana-2/edit/api
 * https://developers.openai.com/api/docs/models/gpt-image-2
 *
 * Kling Kolors Virtual Try-On v1.5 was checked against its live fal.ai page
 * and is deprecated there ("This model is no longer supported"), with no
 * direct multi-garment replacement in fal's current try-on catalog, so it
 * has been dropped entirely rather than routed to a dead endpoint. Nano
 * Banana 2 accepts up to 14 reference images per edit, which covers the
 * multi-garment `set` case Kling used to handle.
 */
export type ProviderKey = 'fashn' | 'nano_banana' | 'openai_image';

export const MODEL_IDS: Record<ProviderKey, string> = {
  fashn: 'fal-ai/fashn/tryon/v1.6',
  nano_banana: 'fal-ai/nano-banana-2/edit',
  openai_image: 'gpt-image-2',
};

/** Updated here when a provider's per-call pricing changes; nowhere else references these numbers. */
export const PROVIDER_COST_CENTS: Record<ProviderKey, number> = {
  fashn: 8, // ~$0.075/render
  nano_banana: 8, // ~$0.08/render
  openai_image: 5, // ~$0.042/render, gpt-image-2 standard quality
};

export const ROUTING: Record<GarmentCategory, ProviderKey[]> = {
  top: ['fashn', 'nano_banana'],
  bottom: ['fashn', 'nano_banana'],
  one_piece: ['fashn', 'nano_banana'],
  outerwear: ['fashn', 'nano_banana'],
  set: ['nano_banana', 'openai_image'],
  shoes: ['nano_banana', 'openai_image'],
  accessory: ['nano_banana', 'openai_image'],
  unknown: ['nano_banana', 'openai_image'],
};
