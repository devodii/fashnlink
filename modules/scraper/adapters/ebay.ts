import { createCheckoutPageAdapter } from '../shared/checkout-page-adapter';

// UNVERIFIED against live markup, deliberately left that way — this is a
// policy decision, not a limitation of time or tooling.
//
// Every ebay.* domain (18 country TLDs checked) returns an Akamai edge 403,
// including the bare homepage. Initially this looked IP-reputation-based
// (the sandbox's egress was a VPN exit node at the time), but that's been
// ruled out: after switching to a normal residential/ISP IP, eBay still
// returns 403, still from `server: AkamaiGHost`, still setting real Akamai
// Bot Manager session cookies (`bm_s`/`bm_so`) on the response — i.e. this
// is Akamai fingerprinting the request itself (TLS/HTTP client shape), not
// blocking the source IP. A plain fetch or curl will not get past this
// regardless of where it runs from, short of mimicking a real browser's
// TLS/JS fingerprint closely enough to fool Bot Manager.
//
// That bypass was deliberately not attempted: eBay's own robots.txt states
// "Automated scraping, buy-for-me agents, LLM-driven bots, or any
// end-to-end flow that attempts to place orders without human review is
// strictly prohibited... Approved enterprise integrations must use our
// official API." Fingerprint-spoofing around Bot Manager to get past that
// is exactly the kind of automated access it's asking not to happen, so
// this is left blocked on purpose rather than worked around.
//
// No archived capture of any eBay /itm/ listing turned up on the Wayback
// Machine either (unlike Jumia's product pages, eBay's aren't
// crawled/archived there), so there was never a legitimate real fixture
// available. There is no fixture or test file for this adapter.
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
