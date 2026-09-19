import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { magentoAdapter } from './magento';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/magento');

/**
 * Both fixtures are from Forever New (forevernew.com.au), the only real,
 * live Magento store found during fixture collection with individually
 * scrapable product pages; several other confirmed-Magento sites are
 * headless PWA storefronts with no server-rendered OG/JSON-LD data at all.
 */
const FIXTURE_STORES = [
  {
    name: 'forevernew1',
    url: 'https://www.forevernew.com.au/liberty-flutter-sleeve-lace-midi-dress-301551',
  },
  { name: 'forevernew2', url: 'https://www.forevernew.com.au/joy-short-sleeve-midi-dress-304835' },
];

describe('magento adapter (fixture-based, no network)', () => {
  it('detects magento from real homepage signals', () => {
    const html = readFileSync(path.join(FIXTURE_DIR, 'forevernew.homepage.html'), 'utf-8');
    const probe = {
      url: new URL('https://www.forevernew.com.au/'),
      status: 200,
      headers: new Headers(),
      html,
    };
    return magentoAdapter.detect(probe, fakeCtxWithHtml(html)).then((result) => {
      expect(result.match).toBe(true);
    });
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} product page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.product-page.html`), 'utf-8');
      const rawResult = await magentoAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = magentoAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.images.length).toBeGreaterThan(0);
    });
  }
});
