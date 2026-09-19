import { createThinJsonLdAdapter } from '../shared/thin-adapter';

// Section 6.5: detect via host/HTML signals, getProduct via JSON-LD,
// listProducts via `sitemap.xml -> store-products-sitemap*.xml`. Confirmed
// against 2 real stores: Wix's own sitemap index names that child sitemap
// exactly `store-products-sitemap.xml`.
export const wixAdapter = createThinJsonLdAdapter({
  key: 'wix',
  displayName: 'Wix',
  priority: 40,
  sitemapNameFilter: /store-products-sitemap/i,
});
