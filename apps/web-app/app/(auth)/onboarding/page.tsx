import { Suspense } from 'react';
import { requireMerchant } from '@/actions/merchants';
import { env } from '@/lib/env';
import { Container } from '@/components/container';
import { OnboardingWizard } from './onboarding-wizard';

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
