import { createCheckoutPageAdapter } from '../shared/checkout-page-adapter';

/**
 * Untested against a real live fixture, unlike gumroad/bigcartel: no
 * currently-live LemonSqueezy checkout URL could be found. Every example URL
 * found (including ones on LemonSqueezy's own marketing site) 404s; their
 * checkout links appear to be generated per-campaign and go stale, unlike
 * Gumroad/Big Cartel's stable product URLs. Verify against a real page
 * before relying on this adapter in production.
 */
export const lemonsqueezyAdapter = createCheckoutPageAdapter({
  key: 'lemonsqueezy',
  displayName: 'Lemon Squeezy',
  priority: 60,
  hostPatterns: [/\.lemonsqueezy\.com$/],
});
