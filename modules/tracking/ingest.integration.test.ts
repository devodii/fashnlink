import { afterAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { Experimental_EvaluationMockModelV4 } from 'ai/test';
import { db } from '@/db';
import { discoveredPaths, merchants, stores } from '@/db/schema';
import { newId } from '@/lib/ids';
import { logger } from '@/lib/log';
import { DISCOVERED_PATHS_MAX_PER_STORE } from '@/constants';

/**
 * Integration test against the REAL local Postgres, proving the ingestion
 * pipeline end to end: token lookup, path validation/dedup, upsert behavior
 * (lastSeenAt bump instead of duplication), the per-store cap, and origin
 * host learning. No Redis rate-limit-exceeded case here (that's covered by
 * the mocked unit test); a fresh unique token per test never trips the
 * real rate limiter within these runs. Jev itself is mocked, same as
 * modules/tracking/classify.test.ts and modules/scraper/wearable-gate-jev.test.ts,
 * so this stays a real-Postgres test without depending on live network/AI access.
 */

type DoEvaluate = NonNullable<
  NonNullable<ConstructorParameters<typeof Experimental_EvaluationMockModelV4>[0]>['doEvaluate']
>;

const mockDoEvaluate: ReturnType<typeof vi.fn<DoEvaluate>> = vi.fn((options) => {
  const state = options.state as { path: string };
  const probability = /^\/(products?|shop|collections?|p|items?)\//.test(state.path) ? 0.95 : 0.05;
  return Promise.resolve(jevAnswer(probability));
});

vi.mock('@/lib/jev', () => ({
  get jevModel() {
    return new Experimental_EvaluationMockModelV4({
      provider: 'typesafe-ai',
      modelId: 'jev',
      supportedQuestionTypes: ['boolean'],
      doEvaluate: (options) => mockDoEvaluate(options),
    });
  },
}));

function jevAnswer(probability: number) {
  return {
    answers: { is_product_path: { type: 'boolean' as const, probability } },
    warnings: [],
  };
}

const { ingestDiscoveredPaths } = await import('./ingest');

const SUFFIX = `track-ingest-test-${Date.now()}`;
let merchantId: string;
let storeId: string;
let token: string;

afterAll(async () => {
  await db.delete(discoveredPaths).where(eq(discoveredPaths.storeId, storeId));
  await db.delete(stores).where(eq(stores.id, storeId));
  await db.delete(merchants).where(eq(merchants.id, merchantId));
});

describe('ingestDiscoveredPaths against a real local Postgres', () => {
  it('rejects an unknown token without creating anything', async () => {
    const result = await ingestDiscoveredPaths(
      {
        token: `${SUFFIX}-unknown`,
        paths: [{ path: '/products/x', linkText: null }],
        originHost: null,
      },
      logger,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('scores, upserts, and dedupes discovered paths for a known token', async () => {
    merchantId = newId('merch');
    await db
      .insert(merchants)
      .values({ id: merchantId, email: `${SUFFIX}@example.com`, name: 'Tracking Test Merchant' });

    storeId = newId('store');
    token = `${SUFFIX}-token`;
    await db.insert(stores).values({
      id: storeId,
      merchantId,
      domain: `custom:${merchantId}`,
      platform: 'custom',
      trackingToken: token,
    });

    const first = await ingestDiscoveredPaths(
      {
        token,
        paths: [
          { path: '/products/linen-shirt', linkText: 'Linen Shirt' },
          { path: '/about', linkText: 'About us' },
          { path: '/products/linen-shirt', linkText: 'duplicate in same batch' },
        ],
        originHost: `${SUFFIX}.example.com`,
      },
      logger,
    );
    expect(first.ok).toBe(true);

    const rows = await db
      .select()
      .from(discoveredPaths)
      .where(eq(discoveredPaths.storeId, storeId));
    expect(rows).toHaveLength(2);

    const productRow = rows.find((r) => r.path === '/products/linen-shirt');
    expect(productRow).toBeTruthy();
    expect(productRow!.score).toBeGreaterThan(0);
    expect(productRow!.linkText).toBe('Linen Shirt');

    const aboutRow = rows.find((r) => r.path === '/about');
    expect(aboutRow).toBeTruthy();
    expect(aboutRow!.score).toBeLessThan(0);

    const [storeAfter] = await db.select().from(stores).where(eq(stores.id, storeId));
    expect(storeAfter?.domain).toBe(`${SUFFIX}.example.com`);

    const firstSeenAt = productRow!.firstSeenAt;
    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = await ingestDiscoveredPaths(
      {
        token,
        paths: [{ path: '/products/linen-shirt', linkText: 'Linen Shirt' }],
        originHost: null,
      },
      logger,
    );
    expect(second.ok).toBe(true);

    const rowsAfterRepeat = await db
      .select()
      .from(discoveredPaths)
      .where(eq(discoveredPaths.storeId, storeId));
    expect(rowsAfterRepeat).toHaveLength(2);
    const bumped = rowsAfterRepeat.find((r) => r.path === '/products/linen-shirt');
    expect(bumped!.firstSeenAt.getTime()).toBe(firstSeenAt.getTime());
    expect(bumped!.lastSeenAt.getTime()).toBeGreaterThan(firstSeenAt.getTime());
  });

  it('stops accepting new distinct paths once the per-store cap is reached', async () => {
    const capMerchantId = newId('merch');
    await db.insert(merchants).values({
      id: capMerchantId,
      email: `${SUFFIX}-cap@example.com`,
      name: 'Cap Test Merchant',
    });
    const capStoreId = newId('store');
    const capToken = `${SUFFIX}-cap-token`;
    await db.insert(stores).values({
      id: capStoreId,
      merchantId: capMerchantId,
      domain: `custom:${capMerchantId}`,
      platform: 'custom',
      trackingToken: capToken,
    });

    await db.insert(discoveredPaths).values(
      Array.from({ length: DISCOVERED_PATHS_MAX_PER_STORE }, (_, i) => ({
        id: newId('dpath'),
        storeId: capStoreId,
        path: `/products/filler-${i}`,
        score: 0,
      })),
    );

    const result = await ingestDiscoveredPaths(
      {
        token: capToken,
        paths: [
          { path: '/products/filler-0', linkText: 'already known, should still bump' },
          { path: '/products/brand-new', linkText: 'over the cap, should be dropped' },
        ],
        originHost: null,
      },
      logger,
    );
    expect(result.ok).toBe(true);

    const rows = await db
      .select()
      .from(discoveredPaths)
      .where(eq(discoveredPaths.storeId, capStoreId));
    expect(rows).toHaveLength(DISCOVERED_PATHS_MAX_PER_STORE);
    expect(rows.some((r) => r.path === '/products/brand-new')).toBe(false);

    await db.delete(discoveredPaths).where(eq(discoveredPaths.storeId, capStoreId));
    await db.delete(stores).where(eq(stores.id, capStoreId));
    await db.delete(merchants).where(eq(merchants.id, capMerchantId));
  });
});
