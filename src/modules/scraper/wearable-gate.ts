import { createHash } from 'node:crypto';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { openai } from '@/lib/openai';
import { redis } from '@/lib/redis';
import { WEARABLE_GATE } from '@/config/prompts';
import { KIDS_KEYWORDS, WEARABLE_NEGATIVE, WEARABLE_POSITIVE } from '@/config/wearable-keywords';
import {
  resolveVerdict,
  type FinalWearabilityVerdict,
  type ImageVisionVerdict,
} from '@/config/wearable-rules';

export type WearabilityCandidate = {
  title: string;
  productType: string | null;
  tags: string[];
  descriptionText: string;
  images: { url: string; width: number | null; height: number | null }[];
};

// ---------- Stage 1: text (free, sync, no model) ----------

export type TextStageResult = {
  score: number;
  isKids: boolean;
};

// Exported standalone so it's unit-testable without the model (section 6.7's
// own testing note: "Stage 1 is unit-tested without the model").
export function scoreCandidateText(candidate: WearabilityCandidate): TextStageResult {
  const haystack = [candidate.title, candidate.productType ?? '', ...candidate.tags]
    .join(' ')
    .toLowerCase();

  if (KIDS_KEYWORDS.some((word) => haystack.includes(word))) {
    return { score: 0, isKids: true };
  }

  const positives = WEARABLE_POSITIVE.filter((word) => haystack.includes(word)).length;
  const negatives = WEARABLE_NEGATIVE.filter((word) => haystack.includes(word)).length;
  return { score: positives - 2 * negatives, isKids: false };
}

// ---------- Stage 2: vision (batched, cached) ----------

const visionResponseSchema = z.object({
  images: z.array(
    z.object({
      is_wearable: z.boolean(),
      wearable_type: z.enum([
        'garment',
        'footwear',
        'headwear',
        'eyewear',
        'jewelry',
        'bag',
        'accessory',
        'none',
      ]),
      garment_category: z.enum([
        'top',
        'bottom',
        'one_piece',
        'outerwear',
        'shoes',
        'accessory',
        'set',
        'unknown',
      ]),
      subject_count: z.number().int(),
      image_kind: z.enum([
        'flat_lay',
        'ghost_mannequin',
        'on_model',
        'detail',
        'lifestyle',
        'logo_or_graphic',
        'other',
      ]),
      is_minor_present: z.boolean(),
      usable_for_tryon: z.boolean(),
      confidence: z.number(),
      reason: z.string(),
    }),
  ),
});

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days (section 6.7)

// DECISION: section 6.7 says "cache the verdict in Redis by image phash" —
// true perceptual hashing needs pixel access (`sharp`, section 6.6) which
// only enrichment (a later pipeline step) has; the gate only ever sees a
// source URL. A sha256 of the URL is used as the cache key instead — it still
// makes repeated pastes and re-crawls of the same product free (the actual
// goal), just without near-duplicate (different-URL-same-image) matching,
// which enrichment's real phash dedupe handles separately.
function cacheKeyForImage(url: string): string {
  return `wearable-gate:v1:${createHash('sha256').update(url).digest('hex')}`;
}

async function classifyImagesWithVision(
  images: { url: string; width: number | null; height: number | null }[],
  ctx: Ctx,
): Promise<Result<ImageVisionVerdict[]>> {
  const cached: (ImageVisionVerdict | null)[] = await Promise.all(
    images.map(async (image) => {
      if (!redis) return null;
      const raw = await redis.get<ImageVisionVerdict>(cacheKeyForImage(image.url));
      return raw ?? null;
    }),
  );

  const uncachedIndexes = cached
    .map((value, index) => (value ? null : index))
    .filter((i): i is number => i !== null);

  if (uncachedIndexes.length === 0) {
    return ok(cached as ImageVisionVerdict[]);
  }

  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: WEARABLE_GATE },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Classify these ${uncachedIndexes.length} image(s) in order. Return exactly ${uncachedIndexes.length} entries in "images", one per image, same order.`,
            },
            ...uncachedIndexes.map(
              (i) => ({ type: 'image_url', image_url: { url: images[i].url } }) as const,
            ),
          ],
        },
      ],
      response_format: zodResponseFormat(visionResponseSchema, 'wearable_gate'),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) return err({ code: 'INTERNAL', message: 'wearable gate: empty vision response' });

    const results = [...cached] as ImageVisionVerdict[];
    for (const [position, imageIndex] of uncachedIndexes.entries()) {
      const verdict = parsed.images[position];
      if (!verdict) {
        return err({
          code: 'INTERNAL',
          message: 'wearable gate: vision response image count mismatch',
        });
      }
      results[imageIndex] = verdict;
      if (redis) {
        await redis.set(cacheKeyForImage(images[imageIndex].url), verdict, {
          ex: CACHE_TTL_SECONDS,
        });
      }
    }
    return ok(results);
  } catch (cause) {
    ctx.log.error({ cause }, 'wearable gate vision call failed');
    return err({ code: 'INTERNAL', message: 'Wearable gate vision call failed', cause });
  }
}

// Section 6.7's public entry point, run in the pipeline between `normalize`
// and `enrich` (section 6.2 step 5b) and again in the manual-upload path.
// Only the top 3 candidate images are considered, per spec.
export async function assessWearability(
  candidate: WearabilityCandidate,
  ctx: Ctx,
): Promise<Result<FinalWearabilityVerdict>> {
  const text = scoreCandidateText(candidate);

  if (text.isKids) {
    return ok({
      eligibility: 'kids',
      eligibilityReason: 'text:kids',
      wearableType: 'none',
      garmentCategory: 'unknown',
      tryonSourceIndex: null,
    });
  }

  if (text.score <= -1) {
    return ok({
      eligibility: 'not_wearable',
      eligibilityReason: 'text:negative',
      wearableType: 'none',
      garmentCategory: 'unknown',
      tryonSourceIndex: null,
    });
  }

  const topImages = candidate.images.slice(0, 3);
  if (topImages.length === 0) {
    return ok({
      eligibility: 'no_usable_image',
      eligibilityReason: 'no_images',
      wearableType: 'none',
      garmentCategory: 'unknown',
      tryonSourceIndex: null,
    });
  }

  const visionResult = await classifyImagesWithVision(topImages, ctx);
  if (!visionResult.ok) return visionResult;

  const perImage = topImages.map((image, i) => ({
    verdict: visionResult.value[i],
    width: image.width,
    height: image.height,
  }));

  return ok(resolveVerdict(perImage));
}
