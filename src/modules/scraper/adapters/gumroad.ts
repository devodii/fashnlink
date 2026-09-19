import { createCheckoutPageAdapter } from '../shared/checkout-page-adapter';

// Verified against 2 real, live product pages (product:price:amount,
// og:title, og:image all present).
export const gumroadAdapter = createCheckoutPageAdapter({
  key: 'gumroad',
  displayName: 'Gumroad',
  priority: 60,
  hostPatterns: [/\.gumroad\.com$/],
});
