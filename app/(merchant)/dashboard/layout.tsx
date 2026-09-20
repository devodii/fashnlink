import { redirect } from 'next/navigation';
import { requireMerchant } from '@/modules/auth/require-merchant';
import type { MerchantSettings } from '@/actions/merchants';
import { readMerchant } from '@/actions/merchants';
import { PLANS, FOUNDING_PASS_SEATS_TOTAL, formatPriceCents } from '@/config/pricing';
import { env } from '@/lib/env';
import { FoundingPassBanner } from '@/components/founding-pass-banner';
import { DashboardNav } from './dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const merchant = await requireMerchant();
  const settings = (merchant.settings as MerchantSettings) ?? {};

  if (!settings.contactChannel) redirect('/onboarding');

  const canBuyFoundingPass =
    merchant.plan === 'free' && Boolean(env.POLAR_FOUNDING_PASS_PRODUCT_ID);
  let banner: React.ReactNode = null;
  if (canBuyFoundingPass) {
    const founderCount = await readMerchant({ countByPlan: 'founder' });
    const seatsRemaining = Math.max(FOUNDING_PASS_SEATS_TOTAL - founderCount, 0);
    if (seatsRemaining > 0) {
      banner = (
        <FoundingPassBanner
          label={`Buy founding pass for ${formatPriceCents(PLANS.founder.priceCents)}`}
          note={`${seatsRemaining} of ${FOUNDING_PASS_SEATS_TOTAL} seats left`}
        />
      );
    }
  }

  return (
    <DashboardNav
      banner={banner}
      user={{ name: merchant.name, email: merchant.email, logoUrl: settings.logoUrl }}
    >
      {children}
    </DashboardNav>
  );
}
