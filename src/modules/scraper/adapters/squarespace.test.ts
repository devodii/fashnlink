import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import {
  squarespaceAdapter,
  squarespaceItemSchema,
  type SquarespaceRawProduct,
} from './squarespace';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/squarespace');

const FIXTURE_STORES = [
  { file: 'cakeplussize.product.json', origin: 'https://www.cakeplussize.com' },
  { file: 'dumbindustries.product.json', origin: 'https://dumb-industries.com' },
  { file: 'aaksonline.product.json', origin: 'https://www.aaksonline.com' },
  { file: 'melula.product.json', origin: 'http://www.melula.com' },
];

function readJson(file: string) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf-8'));
}

/**
 * fixture-based unit tests per adapter (recorded real responses,
 * no network), plus the normalizer property test.
 *
 * Only 4 real fixture stores here, not 5; documented shortfall, not a
 * fabricated fixture. A wide search for a 5th real, independent Squarespace
 * merchant (beyond template/demo sites) during fixture collection kept
 * turning up dead domains, sites migrated off Squarespace, or product
 * collections that don't expose ?format=json data (the collection endpoint
 * only returns item data for genuine "product index" collections; several
 * real candidate stores' /shop pages returned an empty `items: []` for
 * reasons not fully diagnosable from the outside, e.g. a different block
 * type or access-restricted collection).
 */
describe('squarespace adapter (fixture-based, no network)', () => {
  for (const { file, origin } of FIXTURE_STORES) {
    it(`normalizes ${file} into a valid NormalizedProduct`, () => {
      const raw = readJson(file).item;
      const parsed = squarespaceItemSchema.parse(raw);
      const rawProduct: SquarespaceRawProduct = { ...parsed, storeOrigin: origin };

      const result = squarespaceAdapter.normalize(rawProduct);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const product = result.value;
      expect(normalizedProductSchema.safeParse(product).success).toBe(true);
      expect(product.title.length).toBeGreaterThan(0);
      expect(product.images.length).toBeGreaterThan(0);
      expect(product.priceCents).not.toBeNull();
      expect(product.priceCents).toBeGreaterThan(0);
      // Squarespace has no cart-permalink scheme; buyUrl is the product page itself.
      expect(product.buyUrl).toBe(product.url);
      expect(product.images.every((image) => image.url.includes('?format=1000w'))).toBe(true);
    });
  }

  it('groups melula variant option values (Color) across all variants', () => {
    const raw = readJson('melula.product.json').item;
    const parsed = squarespaceItemSchema.parse(raw);
    const rawProduct: SquarespaceRawProduct = { ...parsed, storeOrigin: 'http://www.melula.com' };

    const result = squarespaceAdapter.normalize(rawProduct);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const colorOption = result.value.options.find((o) => o.name === 'Color');
    expect(colorOption).toBeTruthy();
    expect(colorOption?.values.length).toBeGreaterThan(0);
    expect(result.value.variants.every((v) => v.color !== null)).toBe(true);
  });

  it('parses a real collection listing (cakeplussize) with variants and images already inline', () => {
    const collectionRaw = readJson('cakeplussize.collection.json');
    expect(Array.isArray(collectionRaw.items)).toBe(true);
    expect(collectionRaw.items.length).toBeGreaterThan(0);

    const first = squarespaceItemSchema.parse(collectionRaw.items[0]);
    const rawProduct: SquarespaceRawProduct = {
      ...first,
      storeOrigin: 'https://www.cakeplussize.com',
    };
    const result = squarespaceAdapter.normalize(rawProduct);
    expect(result.ok).toBe(true);
  });
});
