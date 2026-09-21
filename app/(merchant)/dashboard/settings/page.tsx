import { requireMerchant } from '@/actions/merchants';
import { retrieveStores } from '@/actions/stores';
import type { MerchantSettings } from '@/actions/merchants';

import { PageHeader } from '@/components/page-header';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const merchant = await requireMerchant();
  const [store] = await retrieveStores({ merchantId: merchant.id });
  const settings = (merchant.settings as MerchantSettings) ?? {};

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
    </div>
  );
}
