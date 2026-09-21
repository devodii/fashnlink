import { createThinJsonLdAdapter } from '../shared/thin-adapter';

export const prestashopAdapter = createThinJsonLdAdapter({
  key: 'prestashop',
  displayName: 'PrestaShop',
  priority: 50,
});
