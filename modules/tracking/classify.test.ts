import { afterEach, describe, expect, it, vi } from 'vitest';
import { Experimental_EvaluationMockModelV4 } from 'ai/test';
import { childLogger } from '@/lib/log';

type DoEvaluate = NonNullable<
  NonNullable<ConstructorParameters<typeof Experimental_EvaluationMockModelV4>[0]>['doEvaluate']
>;

let mockDoEvaluate: ReturnType<typeof vi.fn<DoEvaluate>>;

vi.mock('@/lib/jev', () => ({
  get jevModel() {
    return new Experimental_EvaluationMockModelV4({
      provider: 'typesafe-ai',
      modelId: 'jev',
      supportedQuestionTypes: ['boolean'],
      doEvaluate: (options) => mockDoEvaluate!(options),
    });
  },
}));

function log() {
  return childLogger('tracking-classify-test');
}

function jevAnswer(probability: number) {
  return {
    answers: { is_product_path: { type: 'boolean' as const, probability } },
    warnings: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scoreDiscoveredPath', () => {
  it('scores a high-probability product path positively', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0.95));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath(
      { path: '/products/linen-shirt', linkText: 'Linen Shirt - $48.00' },
      log(),
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals).toContain('jev');
  });

  it('scores a low-probability non-product path negatively', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0.05));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath({ path: '/about', linkText: 'About us' }, log());

    expect(result.score).toBeLessThan(0);
  });

  it('scores a 0.5 probability as neutral', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0.5));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath(
      { path: '/random-page-xyz', linkText: 'Random Page' },
      log(),
    );

    expect(result.score).toBe(0);
  });

  it('handles null link text without throwing', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0.8));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath({ path: '/products/hat', linkText: null }, log());

    expect(result.score).toBeGreaterThan(0);
  });

  it('passes path and linkText as jev state', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0.8));
    const { scoreDiscoveredPath } = await import('./classify');

    await scoreDiscoveredPath({ path: '/items/abc', linkText: 'Mug - $12.99' }, log());

    const state = mockDoEvaluate.mock.calls[0][0].state as {
      path: string;
      linkText: string | null;
    };
    expect(state.path).toBe('/items/abc');
    expect(state.linkText).toBe('Mug - $12.99');
  });

  it('scores a mid-high probability path positively with a probability signal', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0.7));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath(
      { path: '/shop/dresses', linkText: 'Shop dresses' },
      log(),
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals).toContain('probability:0.70');
  });

  it('falls open to a neutral score when jev errors', async () => {
    mockDoEvaluate = vi.fn().mockRejectedValue(new Error('jev unavailable'));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath({ path: '/products/x', linkText: null }, log());

    expect(result.score).toBe(0);
    expect(result.signals).toEqual(['jev:error']);
  });

  it('scales probability into a small signed integer range', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(1));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath({ path: '/products/x', linkText: null }, log());

    expect(result.score).toBe(10);
  });

  it('scales a near-zero probability to a negative score', async () => {
    mockDoEvaluate = vi.fn().mockResolvedValue(jevAnswer(0));
    const { scoreDiscoveredPath } = await import('./classify');

    const result = await scoreDiscoveredPath({ path: '/cart', linkText: 'Cart' }, log());

    expect(result.score).toBe(-10);
  });
});
