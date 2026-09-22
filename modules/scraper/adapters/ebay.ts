import { createCheckoutPageAdapter } from '../shared/checkout-page-adapter';

// UNVERIFIED against live markup. Every ebay.* domain (18 country TLDs
// checked) returned an Akamai edge 403 in this environment for every
// request, including the bare homepage, via a plain fetch, a fetch with a
// full realistic Chrome header set, and a real headless-Chromium browser
// executing JS — this sandbox's outbound IP is a Proton VPN exit node,
// which Akamai's bot-management IP reputation list evidently blocks
// outright. eBay's own robots.txt also states: "Automated scraping,
// buy-for-me agents, LLM-driven bots, or any end-to-end flow that attempts
// to place orders without human review is strictly prohibited... Approved
// enterprise integrations must use our official API." No archived capture
// of any eBay /itm/ listing turned up on the Wayback Machine either (unlike
// Jumia's product pages, eBay's aren't crawled/archived there). Per the
// task brief, this is reported honestly rather than worked around with a
// hand-written fixture: there is no fixture or test file for this adapter.
// createCheckoutPageAdapter is used here as the standard default for a
// host-pattern-routed external marketplace (see bigcartel.ts/gumroad.ts),
// not because eBay's JSON-LD/OG shape has been confirmed to fit it.
export const ebayAdapter = createCheckoutPageAdapter({
  key: 'ebay',
  displayName: 'eBay',
  priority: 60,
  hostPatterns: [
    /\.ebay\.(com|co\.uk|de|fr|ca|com\.au|it|es|nl|ie|at|ch|pl|com\.hk|com\.sg|com\.my|ph|co\.jp)$/,
  ],
});
