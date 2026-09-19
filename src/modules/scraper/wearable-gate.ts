import { createHash } from 'node:crypto';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { experimental_evaluate as evaluate } from 'ai';
import type { Ctx } from '@/lib/adapter';
import { err, ok, type Result } from '@/lib/result';
import { openai } from '@/lib/openai';
import { typesafeAi } from '@/lib/typesafe-ai';
import { redis } from '@/lib/redis';
import { garmentCategoryEnum, wearableTypeEnum } from '@/db/schema';
import {
  WEARABLE_GATE,
  WEARABLE_GATE_JEV_GARMENT_CATEGORY,
  WEARABLE_GATE_JEV_GARMENT_CATEGORY_DESCRIPTIONS,
  WEARABLE_GATE_JEV_IS_KIDS,
  WEARABLE_GATE_JEV_IS_WEARABLE,
} from '@/config/prompts';
import { KIDS_KEYWORDS, WEARABLE_NEGATIVE, WEARABLE_POSITIVE } from '@/config/wearable-keywords';
import {
  resolveVerdict,
  type FinalWearabilityVerdict,
  type ImageVisionVerdict,
} from '@/config/wearable-rules';
import type { GarmentCategory } from './types';

// A cache is never allowed to take the feature it caches down with it — an
// Upstash outage (or, as CI caught, a broken/placeholder REST URL) must
// degrade to "treat as a cache miss", not throw. Every redis read/write in
// this file goes through these two helpers instead of the raw client.
async function safeRedisGet<T>(ctx: Ctx, key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch (cause) {
    ctx.log.warn({ cause, key }, 'wearable gate redis read failed, treating as cache miss');
    return null;
  }
}

async function safeRedisSet(ctx: Ctx, key: string, value: unknown, ttlSeconds: number) {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (cause) {
    ctx.log.warn({ cause, key }, 'wearable gate redis write failed, continuing without cache');
  }
}

export type WearabilityCandidate = {
  title: string;
  productType: string | null;
  tags: string[];
  descriptionText: string;
  images: { url: string; alt?: string | null; width: number | null; height: number | null }[];
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

// ---------- Stage 1b: Jev (TypeSafe AI), fast/cheap text classification ----------
// Added mid-build (user's idea): most of what Stage 2's vision call is asked
// is actually resolvable from text alone (title/tags/description/image alt
// text) — Jev answers that cheaply, and only genuinely visual questions
// (image_kind, usable_for_tryon, subject_count, is_minor_present) still go to
// Stage 2. Jev has NO image modality; never ask it about pixel content.

export type JevStageResult =
  | { outcome: 'not_wearable'; probability: number }
  | { outcome: 'kids'; probability: number }
  | { outcome: 'uncertain'; garmentCategoryGuess: GarmentCategory | null };

// DECISION: Jev's boolean probability is "not guaranteed to be calibrated
// across providers" per the AI SDK's own evaluation docs — thresholds below
// are deliberately conservative (only short-circuit on a strong signal in
// either direction) rather than the naive 0.5 midpoint, so an uncertain call
// always falls through to Stage 2's vision call instead of a wrong gate
// decision skipping it. Tune these against real labeled data once Jev has
// run against production traffic.
const JEV_NOT_WEARABLE_MAX_PROBABILITY = 0.1;
const JEV_KIDS_MIN_PROBABILITY = 0.85;

const CACHE_TTL_SECONDS_JEV = 60 * 60 * 24 * 30; // 30 days, matches Stage 2's convention

function cacheKeyForText(state: unknown): string {
  const hash = createHash('sha256').update(JSON.stringify(state)).digest('hex');
  return `wearable-gate:jev:v1:${hash}`;
}

async function classifyWithJev(
  candidate: WearabilityCandidate,
  ctx: Ctx,
): Promise<Result<JevStageResult>> {
  const state = {
    title: candidate.title,
    productType: candidate.productType,
    tags: candidate.tags,
    descriptionText: candidate.descriptionText.slice(0, 500),
    images: candidate.images.slice(0, 3).map((image) => ({
      alt: image.alt ?? null,
      filename: image.url.split('/').pop()?.split('?')[0] ?? null,
    })),
  };

  const cacheKey = cacheKeyForText(state);
  const cached = await safeRedisGet<JevStageResult>(ctx, cacheKey);
  if (cached) return ok(cached);

  try {
    const result = await evaluate({
      model: typesafeAi.evaluationModel('jev-latest'),
      state,
      questions: {
        is_wearable: { type: 'boolean', instructions: WEARABLE_GATE_JEV_IS_WEARABLE },
        is_kids: { type: 'boolean', instructions: WEARABLE_GATE_JEV_IS_KIDS },
        garment_category: {
          type: 'choice',
          instructions: WEARABLE_GATE_JEV_GARMENT_CATEGORY,
          criteria: Object.fromEntries(
            garmentCategoryEnum.enumValues.map((category) => [
              category,
              WEARABLE_GATE_JEV_GARMENT_CATEGORY_DESCRIPTIONS[category],
            ]),
          ),
        },
      },
    });

    const isWearable = result.answers.is_wearable;
    const isKids = result.answers.is_kids;
    const garmentCategory = result.answers.garment_category;
    if (
      isWearable.type !== 'boolean' ||
      isKids.type !== 'boolean' ||
      garmentCategory.type !== 'choice'
    ) {
      return err({ code: 'INTERNAL', message: 'wearable gate: unexpected jev answer shape' });
    }

    let stageResult: JevStageResult;
    if (isKids.probability >= JEV_KIDS_MIN_PROBABILITY) {
      stageResult = { outcome: 'kids', probability: isKids.probability };
    } else if (isWearable.probability <= JEV_NOT_WEARABLE_MAX_PROBABILITY) {
      stageResult = { outcome: 'not_wearable', probability: isWearable.probability };
    } else {
      const guess = garmentCategoryEnum.enumValues.includes(
        garmentCategory.choice as GarmentCategory,
      )
        ? (garmentCategory.choice as GarmentCategory)
        : null;
      stageResult = { outcome: 'uncertain', garmentCategoryGuess: guess };
    }

    await safeRedisSet(ctx, cacheKey, stageResult, CACHE_TTL_SECONDS_JEV);
    return ok(stageResult);
  } catch (cause) {
    // Jev is a cost/latency optimization, not a safety gate — if it's down or
    // errors, fall through to Stage 2 rather than failing the whole pipeline.
    ctx.log.warn({ cause }, 'wearable gate jev call failed, falling through to vision');
    return ok({ outcome: 'uncertain', garmentCategoryGuess: null });
  }
}

// ---------- Stage 2: vision (batched, cached) ----------

const visionResponseSchema = z.object({
  images: z.array(
    z.object({
      is_wearable: z.boolean(),
      // Runtime-derived from db/schema.ts's enums (not just the TS type) so
      // the values OpenAI is asked to return and the values the DB will
      // accept can never drift apart.
      wearable_type: z.enum(wearableTypeEnum.enumValues),
      garment_category: z.enum(garmentCategoryEnum.enumValues),
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
    images.map((image) => safeRedisGet<ImageVisionVerdict>(ctx, cacheKeyForImage(image.url))),
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
      await safeRedisSet(ctx, cacheKeyForImage(images[imageIndex].url), verdict, CACHE_TTL_SECONDS);
    }
    return ok(results);
  } catch (cause) {
    ctx.log.error({ cause }, 'wearable gate vision call failed');
    return err({ code: 'INTERNAL', message: 'Wearable gate vision call failed', cause });
  }
}

export type WearabilityAssessment = {
  verdict: FinalWearabilityVerdict;
  // Raw per-image Stage 2 output, same order as `candidate.images.slice(0,3)`,
  // `null` for an image that never reached Stage 2 (text short-circuited, or
  // there were no images at all). Enrichment (section 6.6) reuses this for
  // image-role classification instead of running a second vision call.
  perImageVisionVerdicts: (ImageVisionVerdict | null)[];
};

// Section 6.7's public entry point, run in the pipeline between `normalize`
// and `enrich` (section 6.2 step 5b) and again in the manual-upload path.
// Only the top 3 candidate images are considered, per spec.
export async function assessWearability(
  candidate: WearabilityCandidate,
  ctx: Ctx,
): Promise<Result<WearabilityAssessment>> {
  const text = scoreCandidateText(candidate);

  if (text.isKids) {
    return ok({
      verdict: {
        eligibility: 'kids',
        eligibilityReason: 'text:kids',
        wearableType: 'none',
        garmentCategory: 'unknown',
        tryonSourceIndex: null,
      },
      perImageVisionVerdicts: [],
    });
  }

  if (text.score <= -1) {
    return ok({
      verdict: {
        eligibility: 'not_wearable',
        eligibilityReason: 'text:negative',
        wearableType: 'none',
        garmentCategory: 'unknown',
        tryonSourceIndex: null,
      },
      perImageVisionVerdicts: [],
    });
  }

  const jevResult = await classifyWithJev(candidate, ctx);
  if (!jevResult.ok) return jevResult;
  // jevResult.value.garmentCategoryGuess (uncertain case) isn't threaded
  // further — Stage 2's vision call remains authoritative for category when
  // it runs; the guess exists for future telemetry, not decisioning.
  if (jevResult.value.outcome === 'kids') {
    return ok({
      verdict: {
        eligibility: 'kids',
        eligibilityReason: 'text:jev_kids',
        wearableType: 'none',
        garmentCategory: 'unknown',
        tryonSourceIndex: null,
      },
      perImageVisionVerdicts: [],
    });
  }
  if (jevResult.value.outcome === 'not_wearable') {
    return ok({
      verdict: {
        eligibility: 'not_wearable',
        eligibilityReason: 'text:jev_not_wearable',
        wearableType: 'none',
        garmentCategory: 'unknown',
        tryonSourceIndex: null,
      },
      perImageVisionVerdicts: [],
    });
  }

  const topImages = candidate.images.slice(0, 3);
  if (topImages.length === 0) {
    return ok({
      verdict: {
        eligibility: 'no_usable_image',
        eligibilityReason: 'no_images',
        wearableType: 'none',
        garmentCategory: 'unknown',
        tryonSourceIndex: null,
      },
      perImageVisionVerdicts: [],
    });
  }

  const visionResult = await classifyImagesWithVision(topImages, ctx);
  if (!visionResult.ok) return visionResult;

  const perImage = topImages.map((image, i) => ({
    verdict: visionResult.value[i],
    width: image.width,
    height: image.height,
  }));

  return ok({ verdict: resolveVerdict(perImage), perImageVisionVerdicts: visionResult.value });
}
