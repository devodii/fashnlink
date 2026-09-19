import type { GarmentCategory } from '@/modules/scraper/types';

// Section 7.1: render providers, all invoked through fal's queue API
// (https://queue.fal.run/{modelId}). Verified against fal's live model pages
// on 2026-09-19 — real endpoint ids, not guessed:
//   https://fal.ai/models/fal-ai/fashn/tryon/v1.6/api
//   https://fal.ai/models/fal-ai/kling/v1-5/kolors-virtual-try-on/api
//   https://fal.ai/models/fal-ai/nano-banana-2/edit/api
export type ProviderKey = 'fashn' | 'kling' | 'nano_banana';

export const MODEL_IDS: Record<ProviderKey, string> = {
  fashn: 'fal-ai/fashn/tryon/v1.6',
  // DECISION: fal's own docs page for this exact endpoint (the one section
  // 7.1 names) says "This endpoint is deprecated and no longer supported."
  // Kept anyway because the spec is explicit about it and there's no
  // written-down replacement to substitute unasked — flagging here so
  // whoever wires a real FAL_KEY picks fal's current multi-garment/kolors
  // endpoint at that time instead of hitting a dead one.
  kling: 'fal-ai/kling/v1-5/kolors-virtual-try-on',
  nano_banana: 'fal-ai/nano-banana-2/edit',
};

// Cost basis for section 13's pricing config comments — updated here when
// fal's per-call pricing changes, nowhere else references these numbers.
export const PROVIDER_COST_CENTS: Record<ProviderKey, number> = {
  fashn: 8, // ~$0.075/render, section 13
  kling: 7, // ~$0.07/render, section 13
  nano_banana: 8, // ~$0.08/render, section 13
};

// Section 7.1's routing table verbatim: first provider is tried, on failure
// the render engine retries once with the next.
export const ROUTING: Record<GarmentCategory, ProviderKey[]> = {
  top: ['fashn', 'nano_banana'],
  bottom: ['fashn', 'nano_banana'],
  one_piece: ['fashn', 'nano_banana'],
  outerwear: ['fashn', 'nano_banana'],
  set: ['kling', 'nano_banana'],
  shoes: ['nano_banana'],
  accessory: ['nano_banana'],
  unknown: ['nano_banana'],
};
