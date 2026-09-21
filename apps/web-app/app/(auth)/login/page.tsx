'use client';

import * as React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { EmailField } from '@/components/forms/email-field';
import { LoadingButton } from '@/components/loading-button';
import { SplitPane } from '@/components/split-pane';
import { AuthShowcasePanel } from '@/components/auth-showcase-panel';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { ok, err, type Result, type AppError } from '@/lib/result';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const [sent, setSent] = React.useState(false);
  const form = useZodForm(schema, { defaultValues: { email: '' } });

  async function handleSubmit({ email }: Values): Promise<Result<undefined, AppError>> {
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: '/dashboard' });
    if (error) return err({ code: 'INTERNAL', message: 'Something went wrong. Try again.' });
    setSent(true);
    return ok(undefined);
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center bg-background p-4 md:p-6">
      <SplitPane
        ratio="1:1"
        className="mx-auto w-full max-w-6xl items-stretch gap-0 md:min-h-[calc(100dvh-3rem)]"
        start={
          <div className="flex h-full flex-col justify-center gap-6 px-4 py-10 md:px-12">
            <span className="text-sm font-semibold tracking-tight text-foreground">tryon</span>

            <div className="mx-auto w-full max-w-xs space-y-6">
              <h1 className="text-lg font-medium text-foreground">Sign in</h1>

              {sent ? (
                <p className="text-sm text-muted-foreground">
                  Check your email for a sign-in link.
                </p>
              ) : (
                <Form form={form} onSubmit={handleSubmit} className="w-full">
                  <EmailField
                    control={form.control}
                    name="email"
                    label="Email"
                    placeholder="you@shop.com"
                  />
                  <LoadingButton
                    type="submit"
                    loading={form.formState.isSubmitting}
                    className="w-full"
                  >
                    Send magic link
                  </LoadingButton>
                </Form>
              )}

              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
                }
              >
                Continue with Google
              </Button>
            </div>
          </div>
        }
        end={<AuthShowcasePanel className="hidden h-full md:flex" />}
      />
    </main>
  );
}
