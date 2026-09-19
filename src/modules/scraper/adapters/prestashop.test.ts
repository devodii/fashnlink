import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { prestashopAdapter } from './prestashop';
import { fakeCtxWithHtml } from '../shared/test-fetch';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/prestashop');

const FIXTURE_STORES = [
  {
    name: 'carillons1',
    url: 'https://www.carillons.be/pendentifs/930-pendentif-petit-moulin-a-prieres-8435131208803.html',
  },
  {
    name: 'carillons2',
    url: 'https://www.carillons.be/bracelets/1427-bracelet-mala-rudraksha-8435131203242.html',
  },
];

/**
 * 2 real fixture products from carillons.be, a real live
 * PrestaShop store (jewelry/wellness accessories, confirmed via the
 * `prestashop` + `/modules/` HTML signal pair).
 */
describe('prestashop adapter (fixture-based, no network)', () => {
  it('detects prestashop from real homepage signals', () => {
    const html = readFileSync(path.join(FIXTURE_DIR, 'carillons.homepage.html'), 'utf-8');
    const probe = {
      url: new URL('https://www.carillons.be/'),
      status: 200,
      headers: new Headers(),
      html,
    };
    return prestashopAdapter.detect(probe, fakeCtxWithHtml(html)).then((result) => {
      expect(result.match).toBe(true);
    });
  });

  for (const { name, url } of FIXTURE_STORES) {
    it(`scrapes and normalizes a real ${name} product page`, async () => {
      const html = readFileSync(path.join(FIXTURE_DIR, `${name}.product-page.html`), 'utf-8');
      const rawResult = await prestashopAdapter.getProduct(new URL(url), fakeCtxWithHtml(html));
      expect(rawResult.ok).toBe(true);
      if (!rawResult.ok) return;

      const normalized = prestashopAdapter.normalize(rawResult.value);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) return;

      expect(normalizedProductSchema.safeParse(normalized.value).success).toBe(true);
      expect(normalized.value.images.length).toBeGreaterThan(0);
    });
  }
});
