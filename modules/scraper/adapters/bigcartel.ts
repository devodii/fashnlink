import { createCheckoutPageAdapter } from '../shared/checkout-page-adapter';

// Verified against 2 real, live product pages (og:price:amount, og:title,
// og:image all present).
export const bigcartelAdapter = createCheckoutPageAdapter({
  key: 'bigcartel',
  displayName: 'Big Cartel',
  priority: 60,
  hostPatterns: [/\.bigcartel\.com$/],
});
