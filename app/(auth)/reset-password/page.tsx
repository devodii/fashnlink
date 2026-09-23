import { Suspense } from 'react';
import { SplitPane } from '@/components/split-pane';
import { AuthShowcasePanel } from '@/components/auth-showcase-panel';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center bg-background p-4 md:p-6">
      <SplitPane
        ratio="1:1"
        className="mx-auto w-full max-w-6xl items-stretch gap-0 md:min-h-[calc(100dvh-3rem)]"
        start={
          <div className="flex h-full flex-col justify-center gap-6 px-4 py-10 md:px-12">
            <span className="text-sm font-semibold tracking-tight text-foreground">tryon</span>

            <div className="mx-auto w-full max-w-xs space-y-6">
              <div className="space-y-1">
                <h1 className="text-lg font-medium text-foreground">Reset your password</h1>
                <p className="text-sm text-muted-foreground">Choose a new password below.</p>
              </div>

              <Suspense>
                <ResetPasswordForm />
              </Suspense>
            </div>
          </div>
        }
        end={<AuthShowcasePanel className="hidden h-full md:flex" />}
      />
    </main>
  );
}
