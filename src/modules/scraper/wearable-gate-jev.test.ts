import { afterEach, describe, expect, it, vi } from 'vitest';
import { Experimental_EvaluationMockModelV4 } from 'ai/test';
import type { Ctx } from '@/lib/adapter';
import { childLogger } from '@/lib/log';
import type { WearabilityCandidate } from './wearable-gate';

/**
 * Jev (TypeSafe AI) has no image modality; Stage 1b only ever sees text, so
 * it's fully testable against the AI SDK's own mock evaluation model, no live
 * API key needed. This exercises the REAL `experimental_evaluate` validation/
 * answer-shaping logic against a fake model, per `ai/test`'s intended use.
 */

/**
 * Redis is mocked to `null` (an already-supported, already-tested state per
 * src/lib/redis.ts's own null-safety convention) so this suite never depends
 * on real network state; whatever UPSTASH_REDIS_REST_URL happens to resolve
 * to in a given environment (unset locally, a placeholder in CI) is
 * irrelevant to what's being tested here. A CI run once actually hit this:
 * its placeholder Upstash URL doesn't resolve, and the client's own
 * retry/backoff before failing took long enough to blow the test timeout
 * even with `classifyWithJev`'s try/catch correctly in place.
 */
vi.mock('@/lib/redis', () => ({ redis: null }));

type DoEvaluate = NonNullable<
  NonNullable<ConstructorParameters<typeof Experimental_EvaluationMockModelV4>[0]>['doEvaluate']
>;

let mockDoEvaluate: ReturnType<typeof vi.fn<DoEvaluate>>;

vi.mock('@/lib/jev', () => ({
  get jevModel() {
    return new Experimental_EvaluationMockModelV4({
      provider: 'typesafe-ai',
      modelId: 'jev-latest',
      supportedQuestionTypes: ['boolean', 'choice', 'score'],
      doEvaluate: (options) => mockDoEvaluate!(options),
    });
  },
}));

function ctx(): Ctx {
  return {
    log: childLogger('wearable-gate-jev-test'),
    requestId: 'wearable-gate-jev-test',
    deadlineMs: Date.now() + 30_000,
    fetch: global.fetch,
  };
}

function candidate(overrides: Partial<WearabilityCandidate> = {}): WearabilityCandidate {
  return {
    title: 'Something',
    productType: null,
    tags: [],
    descriptionText: '',
    images: [],
    ...overrides,
  };
}

function jevAnswers({
  isWearable,
  isKids,
  category = 'top',
}: {
  isWearable: number;
  isKids: number;
  category?: string;
}) {
  return {
    answers: {
      is_wearable: { type: 'boolean' as const, probability: isWearable },
      is_kids: { type: 'boolean' as const, probability: isKids },
      garment_category: { type: 'choice' as const, choice: category },
    },
    warnings: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('classifyWithJev / assessWearability Stage 1b', () => {
  it('rejects a high-confidence not-wearable product without reaching stage 2', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.02, isKids: 0.01 }));
    const { assessWearability } = await import('./wearable-gate');

    /**
     * Deliberately no stage-1a keyword hits (positive or negative); this
     * proves stage 1b, not stage 1a, produced the rejection.
     */
    const result = await assessWearability(candidate({ title: 'Desert Bloom No. 4' }), ctx());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdict.eligibility).toBe('not_wearable');
    expect(result.value.verdict.eligibilityReason).toBe('text:jev_not_wearable');
    expect(mockDoEvaluate).toHaveBeenCalledTimes(1);
  });

  it('marks a high-confidence kids product without reaching stage 2', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.9, isKids: 0.95 }));
    const { assessWearability } = await import('./wearable-gate');

    const result = await assessWearability(candidate({ title: 'Cozy onesie' }), ctx());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdict.eligibility).toBe('kids');
    expect(result.value.verdict.eligibilityReason).toBe('text:jev_kids');
  });

  it('falls through to a vision-required path when jev is uncertain', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.6, isKids: 0.1 }));
    const { assessWearability } = await import('./wearable-gate');

    /**
     * No images -> the pipeline's own "no_usable_image" path, proving Jev
     * did NOT short-circuit this uncertain case and control passed onward.
     */
    const result = await assessWearability(candidate({ title: 'A thing' }), ctx());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdict.eligibility).toBe('no_usable_image');
  });

  it('falls through to stage 2 instead of failing the pipeline when jev errors', async () => {
    mockDoEvaluate = vi.fn().mockRejectedValue(new Error('jev unavailable'));
    const { assessWearability } = await import('./wearable-gate');

    const result = await assessWearability(candidate({ title: 'A thing' }), ctx());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdict.eligibility).toBe('no_usable_image');
  });

  it('sends title, tags, description, and image alt/filename as jev state, no image bytes', async () => {
    /**
     * Low isWearable so stage 1b short-circuits the rejection itself; this
     * test only cares about the *request* sent to jev, not stage 2, and a
     * real (unmocked) stage-2 OpenAI call here would hang against the
     * placeholder API key in this sandbox.
     */
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.02, isKids: 0.1 }));
    const { assessWearability } = await import('./wearable-gate');

    await assessWearability(
      candidate({
        title: 'Linen shirt',
        productType: 'Shirts',
        tags: ['linen', 'summer'],
        descriptionText: 'A breathable linen shirt.',
        images: [
          {
            url: 'https://cdn.example.com/linen-shirt-front.jpg?v=2',
            alt: 'Front view',
            width: null,
            height: null,
          },
        ],
      }),
      ctx(),
    );

    const state = mockDoEvaluate.mock.calls[0][0].state as {
      title: string;
      tags: string[];
      images: { alt: string | null; filename: string | null }[];
    };
    expect(state.title).toBe('Linen shirt');
    expect(state.tags).toEqual(['linen', 'summer']);
    expect(state.images[0].alt).toBe('Front view');
    expect(state.images[0].filename).toBe('linen-shirt-front.jpg');
    expect(JSON.stringify(state)).not.toMatch(/^data:|base64/);
  });
});
