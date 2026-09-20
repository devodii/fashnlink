import { requireMerchant } from '@/modules/auth/require-merchant';
import type { MerchantSettings } from '@/db/repos/merchants';
import { DashboardNav } from './dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const merchant = await requireMerchant();
  const settings = (merchant.settings as MerchantSettings) ?? {};

  return (
    <DashboardNav user={{ name: merchant.name, email: merchant.email, logoUrl: settings.logoUrl }}>
      {children}
    </DashboardNav>
  );
}
