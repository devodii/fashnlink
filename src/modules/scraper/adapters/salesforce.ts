import { createThinJsonLdAdapter } from '../shared/thin-adapter';

export const salesforceAdapter = createThinJsonLdAdapter({
  key: 'salesforce',
  displayName: 'Salesforce Commerce Cloud',
  priority: 50,
});
