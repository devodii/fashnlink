import { describe, expect, it } from 'vitest';
import { scoreDiscoveredPath } from './classify';

describe('scoreDiscoveredPath', () => {
  it('scores a /products/ path with a plausible link text highly', () => {
    const result = scoreDiscoveredPath({
      path: '/products/linen-shirt',
      linkText: 'Linen Shirt - $48.00',
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it('scores a /shop/ collections path positively', () => {
    const result = scoreDiscoveredPath({
      path: '/collections/new-arrivals',
      linkText: 'Shop new arrivals',
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it('scores a /p/ style product path positively', () => {
    const result = scoreDiscoveredPath({ path: '/p/12345', linkText: 'Buy now' });
    expect(result.score).toBeGreaterThan(0);
  });

  it('scores /about negatively', () => {
    const result = scoreDiscoveredPath({ path: '/about', linkText: 'About us' });
    expect(result.score).toBeLessThan(0);
  });

  it('scores /cart negatively', () => {
    const result = scoreDiscoveredPath({ path: '/cart', linkText: 'Cart' });
    expect(result.score).toBeLessThan(0);
  });

  it('scores /privacy-policy negatively', () => {
    const result = scoreDiscoveredPath({ path: '/privacy-policy', linkText: 'Privacy Policy' });
    expect(result.score).toBeLessThan(0);
  });

  it('scores /contact negatively', () => {
    const result = scoreDiscoveredPath({ path: '/contact', linkText: 'Contact' });
    expect(result.score).toBeLessThan(0);
  });

  it('treats an unrecognized path with neutral link text as neutral', () => {
    const result = scoreDiscoveredPath({ path: '/random-page-xyz', linkText: 'Random Page' });
    expect(result.score).toBe(0);
  });

  it('handles null link text without throwing', () => {
    const result = scoreDiscoveredPath({ path: '/products/hat', linkText: null });
    expect(result.score).toBeGreaterThan(0);
  });

  it('boosts a price-like link text', () => {
    const withPrice = scoreDiscoveredPath({ path: '/items/abc', linkText: 'Mug - $12.99' });
    const withoutPrice = scoreDiscoveredPath({ path: '/items/abc', linkText: 'Mug' });
    expect(withPrice.score).toBeGreaterThan(withoutPrice.score);
  });

  it('records matched signals for a positive path', () => {
    const result = scoreDiscoveredPath({ path: '/shop/dresses', linkText: 'Shop dresses' });
    expect(result.signals.length).toBeGreaterThan(0);
  });
});
