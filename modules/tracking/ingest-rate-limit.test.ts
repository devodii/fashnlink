import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/log';

const consumeRateLimit = vi.fn();
const retrieveStores = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args),
}));
vi.mock('@/actions/stores', () => ({
  retrieveStores: (...args: unknown[]) => retrieveStores(...args),
  updateStores: vi.fn(),
}));
vi.mock('@/actions/discovered-paths', () => ({
  countDiscoveredPaths: vi.fn(),
  createDiscoveredPaths: vi.fn(),
  retrieveDiscoveredPaths: vi.fn(),
}));

const { ingestDiscoveredPaths } = await import('./ingest');

describe('ingestDiscoveredPaths rate limiting', () => {
  it('rejects with RATE_LIMITED and never looks up the store when the token is over its budget', async () => {
    consumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 120,
      remaining: 0,
      reset: new Date(),
    });

    const result = await ingestDiscoveredPaths(
      { token: 'some-token', paths: [{ path: '/products/x', linkText: null }], originHost: null },
      logger,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('RATE_LIMITED');
    expect(consumeRateLimit).toHaveBeenCalledWith('track:some-token', 120, 3600);
    expect(retrieveStores).not.toHaveBeenCalled();
  });
});
