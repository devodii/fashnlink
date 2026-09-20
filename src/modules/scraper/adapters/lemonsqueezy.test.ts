import { describe, expect, it } from 'vitest';
import { lemonsqueezyAdapter } from './lemonsqueezy';

/**
 * No currently-live LemonSqueezy checkout URL could be found despite an
 * extensive search: unlike Gumroad/Big Cartel product pages (which are
 * stable, permanent, and publicly indexable), LemonSqueezy checkout links
 * appear to be generated per-campaign and go stale; every real example URL
 * found, including ones linked from LemonSqueezy's own marketing site,
 * 404s. These tests cover only the parts of the adapter that don't require
 * a real fixture: its structural contract (host patterns, no-catalog
 * capability set, buyDeepLink behavior). `getProduct`/`normalize` reuse the
 * exact same `scrapeJsonLdProductPage` already verified against real
 * Gumroad and Big Cartel pages, so the parsing logic itself isn't untested;
 * only this platform's real-world shape is unconfirmed.
 */
describe('lemonsqueezy adapter (structural only, no real fixture found, see comment)', () => {
  it('matches only *.lemonsqueezy.com via hostPatterns', () => {
    expect(lemonsqueezyAdapter.hostPatterns?.some((p) => p.test('my-store.lemonsqueezy.com'))).toBe(
      true,
    );
    expect(lemonsqueezyAdapter.hostPatterns?.some((p) => p.test('lemonsqueezy.com.evil.com'))).toBe(
      false,
    );
  });

  it('never matches via homepage detection (no browsable store homepage)', async () => {
    const result = await lemonsqueezyAdapter.detect(
      {
        url: new URL('https://my-store.lemonsqueezy.com/'),
        status: 200,
        headers: new Headers(),
        html: '',
      },
      {
        log: { info() {}, warn() {}, error() {}, debug() {} } as never,
        requestId: 't',
        deadlineMs: 0,
        fetch: fetch,
      },
    );
    expect(result.match).toBe(false);
  });

  it('has no listProducts capability (no catalog, section 6.5)', () => {
    expect(lemonsqueezyAdapter.capabilities.has('listProducts')).toBe(false);
    expect(lemonsqueezyAdapter.listProducts).toBeUndefined();
  });

  it('buyDeepLink returns the product URL unchanged', () => {
    const product = {
      externalId: 'x',
      handle: 'x',
      title: 'Test',
      url: 'https://my-store.lemonsqueezy.com/buy/abc',
      buyUrl: 'https://my-store.lemonsqueezy.com/buy/abc',
      brand: null,
      productType: null,
      tags: [],
      descriptionText: '',
      priceCents: 1000,
      currency: 'USD',
      available: true,
      images: [
        {
          url: 'https://x/y.png',
          alt: null,
          width: null,
          height: null,
          position: 0,
          variantIds: [],
        },
      ],
      variants: [],
      options: [],
      externalUpdatedAt: null,
      raw: {},
    };
    expect(lemonsqueezyAdapter.buyDeepLink?.(product)).toBe(product.url);
  });
});
