import { createThinJsonLdAdapter } from '../shared/thin-adapter';

export const magentoAdapter = createThinJsonLdAdapter({
  key: 'magento',
  displayName: 'Magento',
  priority: 50,
});
