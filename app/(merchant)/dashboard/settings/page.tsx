import { requireMerchant } from '@/actions/merchants';
import { ensureTrackingStore, retrieveStores } from '@/actions/stores';
import { retrieveDiscoveredPaths } from '@/actions/discovered-paths';
import type { MerchantSettings } from '@/actions/merchants';
import { publicUrl } from '@/lib/env';

import { PageHeader } from '@/components/page-header';
import { SettingsForm } from './settings-form';
import { TrackingSection } from './tracking-section';

export default async function SettingsPage() {
  const merchant = await requireMerchant();
  const [[store], trackingStore] = await Promise.all([
    retrieveStores({ merchantId: merchant.id, excludePlatforms: ['custom'] }),
    ensureTrackingStore(merchant.id),
  ]);
  const settings = (merchant.settings as MerchantSettings) ?? {};
  const discoveredPaths = await retrieveDiscoveredPaths({
    storeIds: [trackingStore.id],
    statuses: ['new'],
  });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PageHeader title="Settings" description="Brand, contact, and account." />
      <SettingsForm
        storeDomain={store?.domain ?? null}
        initial={{
          name: merchant.name,
          accentToken: settings.accentToken ?? '1',
          logoUrl: settings.logoUrl ?? null,
          contactChannel: settings.contactChannel ?? { type: 'whatsapp', value: '' },
        }}
      />
      <TrackingSection
        scriptSrc={`${publicUrl}/api/track.js?s=${trackingStore.trackingToken}`}
        discoveredPaths={discoveredPaths.map((p) => ({
          id: p.id,
          path: p.path,
          linkText: p.linkText,
          score: p.score,
        }))}
      />
    </div>
  );
}
