import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { wixAdapter } from './wix';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../tests/fixtures/scraper/wix');

const FIXTURE_STORES = [
  {
    name: 'evolveclothinggallery',
    url: 'https://www.evolveclothinggallery.com/product-page/new-balance-530-sneakers-mr530rs-silver-metallic-moonbeam',
  },
  {
    name: 'internationaldiamondimporters',
    url: 'https://www.internationaldiamondimporters.com/product-page/sterling-silver-cz-paperclip-bracelet-7inch',
  },
];

/**
 * 2 real fixture stores for this thin adapter, no network in
 * the test suite (fetch stubbed to the recorded HTML).
 */
describe('wix adapter (fixture-based, no network)', () => {
  it('detects wix from real homepage signals', () => {
    const html = readFileSync(
      path.join(FIXTURE_DIR, 'evolveclothinggallery.homepage.html'),
      'utf-8',
    );
    const probe = {
      url: new URL('https://www.evolveclothinggallery.com/'),
      status: 200,
      headers: new Headers(),
      html,
    };
    return wixAdapter.detect(probe, fakeCtxWithHtml(html)).then((result) => {
      expect(result.match).toBe(true);
    });
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} product page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.product-page.html`), 'utf-8');
      const rawResult = await wixAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = wixAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.title.length).toBeGreaterThan(0);
      expect(normalized.value.images.length).toBeGreaterThan(0);
      expect(normalized.value.buyUrl).toBe(normalized.value.url);
    });
  }

  it('the store-products-sitemap.xml fixture contains real product URLs matching the sitemapNameFilter', () => {
    const xml = readFileSync(
      path.join(FIXTURE_DIR, 'evolveclothinggallery.store-products-sitemap.xml'),
      'utf-8',
    );
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    expect(locs.every((loc) => loc.includes('/product-page/'))).toBe(true);
  });
});
