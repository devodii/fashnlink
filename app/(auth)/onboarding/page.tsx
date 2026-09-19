import { Suspense } from 'react';
import { requireMerchant } from '@/modules/auth/require-merchant';
import { env } from '@/lib/env';
import { Container } from '@/components/container';
import { OnboardingWizard } from './onboarding-wizard';

/**
 * runs once after first login. `StepWizard` persists the
 * current step in `?step=`; no server-side "already onboarded" gate is
 * built yet (would need an `onboarded_at`-style column that doesn't exist),
 * so a merchant can always revisit this page; that's an acceptable M5 scope
 * boundary, not a bug.
 */
export default async function OnboardingPage() {
  await requireMerchant();

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-medium text-foreground">Let&apos;s set up your shop</h1>
        <p className="text-sm text-muted-foreground">Three quick steps.</p>
      </div>
      <Suspense>
        <OnboardingWizard appUrl={env.NEXT_PUBLIC_APP_URL} />
      </Suspense>
    </Container>
  );
}
