import { requireMerchant } from '@/modules/auth/require-merchant';
import { DashboardNav } from './dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireMerchant();
  return <DashboardNav>{children}</DashboardNav>;
}
