import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Ctx } from '@/lib/adapter';
import { childLogger } from '@/lib/log';
import type { WearabilityCandidate } from './wearable-gate';

/**
 * Jev (TypeSafe AI) has no image modality; Stage 1b only ever sees text, so
 * it's fully testable by mocking the direct `evaluateWithJev` HTTP client, no
 * live API key or network call needed.
 */

/**
 * Redis is mocked to `null` (an already-supported, already-tested state per
 * lib/redis.ts's own null-safety convention) so this suite never depends
 * on real network state; whatever UPSTASH_REDIS_REST_URL happens to resolve
 * to in a given environment (unset locally, a placeholder in CI) is
 * irrelevant to what's being tested here. A CI run once actually hit this:
 * its placeholder Upstash URL doesn't resolve, and the client's own
 * retry/backoff before failing took long enough to blow the test timeout
 * even with `classifyWithJev`'s try/catch correctly in place.
 */
vi.mock('@/lib/redis', () => ({ redis: null }));

let mockEvaluateWithJev: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<unknown>>>;

vi.mock('@/lib/jev', () => ({
  evaluateWithJev: (...args: unknown[]) => mockEvaluateWithJev!(...args),
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
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('classifyWithJev / assessWearability Stage 1b', () => {
  it('rejects a high-confidence not-wearable product without reaching stage 2', async () => {
    mockEvaluateWithJev = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.02, isKids: 0.01 }));
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
    expect(mockEvaluateWithJev).toHaveBeenCalledTimes(1);
  });

  it('marks a high-confidence kids product without reaching stage 2', async () => {
    mockEvaluateWithJev = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.9, isKids: 0.95 }));
    const { assessWearability } = await import('./wearable-gate');

    const result = await assessWearability(candidate({ title: 'Cozy onesie' }), ctx());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdict.eligibility).toBe('kids');
    expect(result.value.verdict.eligibilityReason).toBe('text:jev_kids');
  });

  it('falls through to a vision-required path when jev is uncertain', async () => {
    mockEvaluateWithJev = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.6, isKids: 0.1 }));
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
    mockEvaluateWithJev = vi.fn().mockRejectedValue(new Error('jev unavailable'));
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
    mockEvaluateWithJev = vi.fn().mockResolvedValue(jevAnswers({ isWearable: 0.02, isKids: 0.1 }));
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

    const state = mockEvaluateWithJev.mock.calls[0][0] as {
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
