import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizedProductSchema } from '../schema';
import { shopifyAdapter, shopifyRawSchema, type ShopifyRawProduct } from './shopify';

const FIXTURE_DIR = path.resolve(__dirname, '../../../../tests/fixtures/scraper/shopify');

const FIXTURE_STORES = [
  { file: 'allbirds.product.js.json', origin: 'https://www.allbirds.com' },
  { file: 'brooklinen.product.js.json', origin: 'https://www.brooklinen.com' },
  { file: 'outdoorvoices.product.js.json', origin: 'https://outdoorvoices.com' },
  { file: 'pact.product.js.json', origin: 'https://pact.com' },
  { file: 'taylorstitch.product.js.json', origin: 'https://taylorstitch.com' },
];

/**
 * fixture-based unit tests per adapter (recorded real responses,
 * no network), plus the normalizer property test ("every fixture must
 * produce a NormalizedProduct that passes the zod schema with at least one
 * image and a title").
 */
describe('shopify adapter (fixture-based, no network)', () => {
  for (const { file, origin } of FIXTURE_STORES) {
    it(`normalizes ${file} into a valid NormalizedProduct`, () => {
      const rawJson = JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf-8'));
      const parsed = shopifyRawSchema.parse(rawJson);
      const raw: ShopifyRawProduct = { ...parsed, storeOrigin: origin, priceFormat: 'cents' };

      const result = shopifyAdapter.normalize(raw);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const product = result.value;
      const schemaCheck = normalizedProductSchema.safeParse(product);
      expect(schemaCheck.success).toBe(true);

      expect(product.title.length).toBeGreaterThan(0);
      expect(product.images.length).toBeGreaterThan(0);
      expect(product.priceCents).not.toBeNull();
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.buyUrl).toMatch(new RegExp(`^${origin}/cart/\\d+:1$`));
      expect(product.images.every((image) => image.url.startsWith('https://'))).toBe(true);
    });
  }

  it('rejects a URL with no /products/{handle} segment', () => {
    const handle = new URL('https://example.com/collections/all').pathname.match(
      /\/products\/([^/?#]+)/,
    )?.[1];
    expect(handle).toBeUndefined();
  });
});
