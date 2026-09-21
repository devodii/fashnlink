import { redirect } from 'next/navigation';
import { requireMerchant, retrieveMerchants } from '@/actions/merchants';
import type { MerchantSettings } from '@/actions/merchants';
import { PLANS, FOUNDING_PASS_SEATS_TOTAL, formatPriceCents } from '@/constants';
import { FoundingPassBanner } from '@/components/founding-pass-banner';
import { DashboardNav } from './dashboard-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const merchant = await requireMerchant();
  const settings = (merchant.settings as MerchantSettings) ?? {};

  if (!settings.contactChannel) redirect('/onboarding');

  const canBuyFoundingPass = merchant.plan === 'free';
  let banner: React.ReactNode = null;
  if (canBuyFoundingPass) {
    const founders = await retrieveMerchants({ plan: 'founder' });
    const seatsRemaining = Math.max(FOUNDING_PASS_SEATS_TOTAL - founders.length, 0);
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
