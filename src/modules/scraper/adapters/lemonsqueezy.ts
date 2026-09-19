import { createCheckoutPageAdapter } from '../shared/checkout-page-adapter';

// Section 6.5: `hostPatterns` only, getProduct from the checkout/buy page,
// buyDeepLink = the same URL, no catalog.
//
// DECISION: unlike gumroad/bigcartel (both verified against real, currently
// live checkout pages during fixture collection), no real, currently-live
// LemonSqueezy checkout URL could be found despite an extensive search —
// every real example URL that turned up (including ones embedded on
// LemonSqueezy's own marketing site) 404s; checkout links appear to be
// generated per-campaign and go stale, unlike Gumroad/Big Cartel's stable
// product URLs. This adapter is therefore built to spec and shares the same
// OpenGraph-fallback scraper already proven against real Gumroad/Big Cartel
// pages, but is untested against a real live LemonSqueezy fixture — flagged
// honestly in the M2 report rather than shipped with a fabricated fixture.
export const lemonsqueezyAdapter = createCheckoutPageAdapter({
  key: 'lemonsqueezy',
  displayName: 'Lemon Squeezy',
  priority: 60,
  hostPatterns: [/\.lemonsqueezy\.com$/],
});
