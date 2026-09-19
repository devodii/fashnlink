import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { bigcommerceAdapter } from './bigcommerce';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/bigcommerce');

const FIXTURE_STORES = [
  { name: 'seaboston', url: 'https://seabostonusa.com/bos-nantucket-fleece/' },
  { name: 'seekairun', url: 'https://seekairun.com/Annabelle-navy/' },
];

// 2 real fixture stores, no network in the test suite.
describe('bigcommerce adapter (fixture-based, no network)', () => {
  it('detects bigcommerce from real homepage signals', () => {
    const html = readFileSync(path.join(FIXTURE_DIR, 'seaboston.homepage.html'), 'utf-8');
    const probe = {
      url: new URL('https://seabostonusa.com/'),
      status: 200,
      headers: new Headers(),
      html,
    };
    return bigcommerceAdapter.detect(probe, fakeCtxWithHtml(html)).then((result) => {
      expect(result.match).toBe(true);
    });
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} product page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.product-page.html`), 'utf-8');
      const rawResult = await bigcommerceAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = bigcommerceAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.title.length).toBeGreaterThan(0);
      expect(normalized.value.images.length).toBeGreaterThan(0);
    });
  }
});
