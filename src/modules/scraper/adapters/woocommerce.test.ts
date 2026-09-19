import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import {
  woocommerceAdapter,
  woocommerceRawSchema,
  type WooCommerceRawProduct,
} from './woocommerce';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/woocommerce');

const FIXTURE_STORES = [
  { file: 'nordrepublic.product.json', origin: 'https://nordrepublic.com' },
  { file: 'migaeyewear.product.json', origin: 'https://migaeyewear.com' },
  { file: 'heroicthread.product.json', origin: 'https://heroicthread.com' },
  { file: 'scrollino.product.json', origin: 'https://www.scrollino.com' },
  { file: 'mammamiaitaly.product.json', origin: 'https://mammamiaitaly.com' },
];

function readJson(file: string) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf-8'));
}

// Section 6.9: fixture-based unit tests per adapter (recorded real responses,
// no network), plus the normalizer property test.
describe('woocommerce adapter (fixture-based, no network)', () => {
  for (const { file, origin } of FIXTURE_STORES) {
    it(`normalizes ${file} into a valid NormalizedProduct`, () => {
      const parsed = woocommerceRawSchema.parse(readJson(file));
      const raw: WooCommerceRawProduct = { ...parsed, storeOrigin: origin, resolvedVariations: [] };

      const result = woocommerceAdapter.normalize(raw);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const product = result.value;
      expect(normalizedProductSchema.safeParse(product).success).toBe(true);
      expect(product.title.length).toBeGreaterThan(0);
      expect(product.images.length).toBeGreaterThan(0);
      expect(product.priceCents).not.toBeNull();
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.buyUrl).toBe(`${origin}/?add-to-cart=${product.externalId}&quantity=1`);
    });
  }

  it('resolves real fetched variations (heroicthread) into sized/colored variants', () => {
    const productParsed = woocommerceRawSchema.parse(readJson('heroicthread.product.json'));
    const variationRaw = readJson('heroicthread.variation.json');

    const raw: WooCommerceRawProduct = {
      ...productParsed,
      storeOrigin: 'https://heroicthread.com',
      resolvedVariations: [
        {
          id: variationRaw.id,
          sku: variationRaw.sku,
          prices: {
            price: variationRaw.prices.price,
            currency_minor_unit: variationRaw.prices.currency_minor_unit,
          },
          is_in_stock: variationRaw.is_in_stock,
          images: variationRaw.images,
          attributes: [
            { name: 'Fabric Color', value: 'black' },
            { name: 'Size', value: '2xl' },
          ],
        },
      ],
    };

    const result = woocommerceAdapter.normalize(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.variants).toHaveLength(1);
    expect(result.value.variants[0].size).toBe('2xl');
    expect(result.value.variants[0].color).toBe('black');
    expect(result.value.variants[0].priceCents).toBe(2000);
    expect(result.value.variants[0].available).toBe(true);
  });

  it('extracts the WordPress post id from a real product page body class', () => {
    const html = readFileSync(path.join(FIXTURE_DIR, 'heroicthread.product-page.html'), 'utf-8');
    const bodyTag = html.match(/<body[^>]*>/i)?.[0] ?? '';
    const postId = bodyTag.match(/\bpostid-(\d+)\b/)?.[1];
    expect(postId).toBe('19535');
  });

  it('buyDeepLink reconstructs the add-to-cart URL for a chosen variant', () => {
    const productParsed = woocommerceRawSchema.parse(readJson('heroicthread.product.json'));
    const raw: WooCommerceRawProduct = {
      ...productParsed,
      storeOrigin: 'https://heroicthread.com',
      resolvedVariations: [],
    };
    const normalized = woocommerceAdapter.normalize(raw);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    const link = woocommerceAdapter.buyDeepLink?.(normalized.value, '19542');
    expect(link).toBe('https://heroicthread.com/?add-to-cart=19535&variation_id=19542&quantity=1');
  });
});
