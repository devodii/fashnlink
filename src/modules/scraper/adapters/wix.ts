import { createThinJsonLdAdapter } from '../shared/thin-adapter';

// Confirmed against 2 real stores: Wix's own sitemap index names the child
// sitemap exactly `store-products-sitemap.xml`.
export const wixAdapter = createThinJsonLdAdapter({
  key: 'wix',
  displayName: 'Wix',
  priority: 40,
  sitemapNameFilter: /store-products-sitemap/i,
});
