import { createThinJsonLdAdapter } from '../shared/thin-adapter';

// Section 6.5: "thin files that mostly delegate to shared helpers jsonld.ts
// and sitemap.ts" — detect + getProduct via JSON-LD + listProducts via
// sitemap.
export const bigcommerceAdapter = createThinJsonLdAdapter({
  key: 'bigcommerce',
  displayName: 'BigCommerce',
  priority: 50,
});
