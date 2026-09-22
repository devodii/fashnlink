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
  // Same 2 listings, fetched live (fresh capture, not archived) once this
  // environment's egress was no longer on a bot-management IP blocklist.
  // Jumia's template changed between the archived capture above (Product
  // nested at ItemPage.mainEntity) and this one (Product as a flat @graph
  // member) — both are real and both are exercised here.
  {
    name: 'mens-tshirt-live',
    url: 'https://www.jumia.com.ng/fashion-2025-men-short-sleeve-t-shirt-401666616.html',
    expectedPriceCents: 1_365_000,
    expectedCurrency: 'NGN',
    expectedExternalId: '401666616',
    minImages: 1,
  },
  {
    name: 'womens-dress-live',
    url: 'https://www.jumia.com.ng/fashion-classy-women-dress-short-sleeve-female-t-shirt-gown-for-elegant-ladies-418565984.html',
    expectedPriceCents: 1_700_000,
    expectedCurrency: 'NGN',
    expectedExternalId: '418565984',
    minImages: 3,
  },
];

/**
 * 4 real fixture product pages (2 listings, captured twice, ~8 months
 * apart, via 2 different genuine methods):
 *
 * - `mens-tshirt`/`womens-dress`: captured via the Wayback Machine
 *   (web.archive.org), because this environment's outbound IP was on a
 *   bot-management IP-reputation blocklist at the time (a VPN exit node)
 *   and got a Cloudflare "Just a moment..." challenge on every jumia.*
 *   domain, confirmed with both a bare HTTP client and a real
 *   headless-Chromium fetch.
 * - `mens-tshirt-live`/`womens-dress-live`: the same 2 URLs, fetched
 *   directly and live once the VPN was off and the IP block was
 *   confirmed gone (jumia.com.ng now returns a real 200).
 *
 * All 4 are genuine, unmodified HTML, not hand-written.
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
