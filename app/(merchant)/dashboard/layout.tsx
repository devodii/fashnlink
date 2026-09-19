import { requireMerchant } from '@/modules/auth/require-merchant';
import { DashboardNav } from './dashboard-nav';

// Section 8.2: every `/dashboard/*` page is auth-gated — `requireMerchant`
// redirects to `/login` when there's no session, so nothing under here needs
// its own check.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireMerchant();
  return <DashboardNav>{children}</DashboardNav>;
}
