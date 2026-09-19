import { createThinJsonLdAdapter } from '../shared/thin-adapter';

// Section 6.5: "thin files that mostly delegate to shared helpers jsonld.ts
// and sitemap.ts" — detect + getProduct via JSON-LD + listProducts via
// sitemap.
export const prestashopAdapter = createThinJsonLdAdapter({
  key: 'prestashop',
  displayName: 'PrestaShop',
  priority: 50,
});
