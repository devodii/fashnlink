import { createThinJsonLdAdapter } from '../shared/thin-adapter';

export const bigcommerceAdapter = createThinJsonLdAdapter({
  key: 'bigcommerce',
  displayName: 'BigCommerce',
  priority: 50,
});
