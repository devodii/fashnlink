import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { gumroadAdapter } from './gumroad';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../tests/fixtures/scraper/gumroad');

const FIXTURE_STORES = [
  { name: 'easypeasyteacher', url: 'https://easypeasyteacher.gumroad.com/l/tozuk' },
  { name: 'annagreen', url: 'https://annagreen.gumroad.com/l/phrjT' },
];

// 2 real fixture checkout pages, no network in the test suite.
describe('gumroad adapter (fixture-based, no network)', () => {
  it('has no listProducts capability (no catalog, section 6.5)', () => {
    expect(gumroadAdapter.capabilities.has('listProducts')).toBe(false);
    expect(gumroadAdapter.listProducts).toBeUndefined();
  });

  it('matches only via hostPatterns, never homepage detection', async () => {
    const result = await gumroadAdapter.detect(
      {
        url: new URL('https://easypeasyteacher.gumroad.com/'),
        status: 200,
        headers: new Headers(),
        html: '',
      },
      fakeCtxWithHtml(''),
    );
    expect(result.match).toBe(false);
    expect(gumroadAdapter.hostPatterns?.some((p) => p.test('easypeasyteacher.gumroad.com'))).toBe(
      true,
    );
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} checkout page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.checkout-page.html`), 'utf-8');
      const rawResult = await gumroadAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = gumroadAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.images.length).toBeGreaterThan(0);
      // buyDeepLink = the same URL.
      expect(gumroadAdapter.buyDeepLink?.(normalized.value)).toBe(normalized.value.url);
    });
  }
});
