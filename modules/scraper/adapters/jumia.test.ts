import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { jumiaAdapter } from './jumia';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../tests/fixtures/scraper/jumia');

const FIXTURES = [
  {
    name: 'mens-tshirt',
    url: 'https://www.jumia.com.ng/fashion-2025-men-short-sleeve-t-shirt-401666616.html',
    expectedPriceCents: 1_365_000,
    expectedCurrency: 'NGN',
    expectedExternalId: '401666616',
    minImages: 1,
  },
  {
    name: 'womens-dress',
    url: 'https://www.jumia.com.ng/fashion-classy-women-dress-short-sleeve-female-t-shirt-gown-for-elegant-ladies-418565984.html',
    expectedPriceCents: 1_700_000,
    expectedCurrency: 'NGN',
    expectedExternalId: '418565984',
    minImages: 3,
  },
];

/**
 * 2 real fixture product pages, captured via the Wayback Machine
 * (web.archive.org) rather than fetched directly: this environment's
 * outbound IP is on a bot-management blocklist and gets a Cloudflare
 * "Just a moment..." challenge on every jumia.* domain, including with a
 * real headless-Chromium fetch, not just a bare HTTP client. Both listings
 * (a men's t-shirt and a women's dress, both currently live on Jumia
 * Nigeria at time of capture) are genuine, unmodified archived HTML, not
 * hand-written.
 */
describe('jumia adapter (fixture-based, no network)', () => {
  it('has no listProducts capability (no public catalog API found)', () => {
    expect(jumiaAdapter.capabilities.has('listProducts')).toBe(false);
    expect(jumiaAdapter.listProducts).toBeUndefined();
  });

  for (const fixture of FIXTURES) {
    it(`scrapes and normalizes a real ${fixture.name} product page`, async () => {
      const html = readFileSync(
        path.join(FIXTURE_DIR, `${fixture.name}.product-page.html`),
        'utf-8',
      );
      const rawResult = await jumiaAdapter.getProduct(new URL(fixture.url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = jumiaAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.externalId).toBe(fixture.expectedExternalId);
      expect(normalized.value.images.length).toBeGreaterThanOrEqual(fixture.minImages);
      expect(normalized.value.priceCents).toBe(fixture.expectedPriceCents);
      expect(normalized.value.currency).toBe(fixture.expectedCurrency);
      expect(jumiaAdapter.buyDeepLink?.(normalized.value)).toBe(normalized.value.url);
    });
  }
});
