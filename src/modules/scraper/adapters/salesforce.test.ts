import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { salesforceAdapter } from './salesforce';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/salesforce');

const FIXTURE_STORES = [
  { name: 'puma1', url: 'https://us.puma.com/us/en/pd/suede-classic-xxi-sneakers/374915' },
  {
    name: 'puma2',
    url: 'https://us.puma.com/us/en/pd/court-classic-street-suede-mens-sneakers/400215',
  },
];

// Section 6.9: 2 real fixture products from puma.com (a real, live Salesforce
// Commerce Cloud / Demandware storefront).
describe('salesforce adapter (fixture-based, no network)', () => {
  it('detects salesforce from real homepage signals', () => {
    const html = readFileSync(path.join(FIXTURE_DIR, 'puma.homepage.html'), 'utf-8');
    const probe = {
      url: new URL('https://www.puma.com/'),
      status: 200,
      headers: new Headers(),
      html,
    };
    return salesforceAdapter.detect(probe, fakeCtxWithHtml(html)).then((result) => {
      expect(result.match).toBe(true);
    });
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} product page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.product-page.html`), 'utf-8');
      const rawResult = await salesforceAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = salesforceAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.images.length).toBeGreaterThan(0);
    });
  }
});
