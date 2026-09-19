import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { bigcartelAdapter } from './bigcartel';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/bigcartel');

const FIXTURE_STORES = [
  { name: 'danozzi1', url: 'https://danozzi.bigcartel.com/product/money-bags-sellout-shirt-black' },
  { name: 'danozzi2', url: 'https://danozzi.bigcartel.com/product/sellout-dad-hat' },
];

/**
 * 2 real fixture checkout pages (both from the same real store ;
 * only one real, live Big Cartel merchant with wearable products turned up
 * during fixture collection; both products are genuinely distinct real
 * items, a shirt and a hat).
 */
describe('bigcartel adapter (fixture-based, no network)', () => {
  it('has no listProducts capability (no catalog, section 6.5)', () => {
    expect(bigcartelAdapter.capabilities.has('listProducts')).toBe(false);
    expect(bigcartelAdapter.listProducts).toBeUndefined();
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} checkout page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.checkout-page.html`), 'utf-8');
      const rawResult = await bigcartelAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = bigcartelAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.images.length).toBeGreaterThan(0);
      expect(normalized.value.priceCents).toBeGreaterThan(0);
      expect(bigcartelAdapter.buyDeepLink?.(normalized.value)).toBe(normalized.value.url);
    });
  }
});
