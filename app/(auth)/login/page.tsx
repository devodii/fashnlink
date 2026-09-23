'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { EmailField } from '@/components/forms/email-field';
import { PasswordField } from '@/components/forms/password-field';
import { LoadingButton } from '@/components/loading-button';
import { SplitPane } from '@/components/split-pane';
import { AuthShowcasePanel } from '@/components/auth-showcase-panel';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { ok, err, type Result, type AppError } from '@/lib/result';

const passwordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type PasswordValues = z.infer<typeof passwordSchema>;

const magicLinkSchema = z.object({ email: z.string().email('Enter a valid email') });
type MagicLinkValues = z.infer<typeof magicLinkSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<'password' | 'magic-link'>('password');
  const [sent, setSent] = React.useState(false);

  const passwordForm = useZodForm(passwordSchema, { defaultValues: { email: '', password: '' } });
  const magicLinkForm = useZodForm(magicLinkSchema, { defaultValues: { email: '' } });

  async function handlePasswordSubmit({
    email,
    password,
  }: PasswordValues): Promise<Result<undefined, AppError>> {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      return err({
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid email or password.',
      });
    }
    router.push('/dashboard');
    return ok(undefined);
  }

  async function handleMagicLinkSubmit({
    email,
  }: MagicLinkValues): Promise<Result<undefined, AppError>> {
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
              <div className="space-y-1">
                <h1 className="text-lg font-medium text-foreground">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to your account</p>
              </div>

              {mode === 'password' ? (
                <div className="space-y-4">
                  <Form form={passwordForm} onSubmit={handlePasswordSubmit}>
                    <EmailField
                      control={passwordForm.control}
                      name="email"
                      label="Email"
                      placeholder="you@shop.com"
                    />
                    <div className="space-y-1.5">
                      <PasswordField
                        control={passwordForm.control}
                        name="password"
                        label="Password"
                      />
                      <div className="text-right">
                        <Link
                          href="/forgot-password"
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </div>
                    <LoadingButton
                      type="submit"
                      loading={passwordForm.formState.isSubmitting}
                      className="w-full"
                    >
                      Sign in
                    </LoadingButton>
                  </Form>
                  <p className="text-center text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setMode('magic-link')}
                      className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Use a magic link instead
                    </button>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sent ? (
                    <p className="text-sm text-muted-foreground">
                      Check your email for a sign-in link.
                    </p>
                  ) : (
                    <Form form={magicLinkForm} onSubmit={handleMagicLinkSubmit}>
                      <EmailField
                        control={magicLinkForm.control}
                        name="email"
                        label="Email"
                        placeholder="you@shop.com"
                      />
                      <LoadingButton
                        type="submit"
                        loading={magicLinkForm.formState.isSubmitting}
                        className="w-full"
                      >
                        Send magic link
                      </LoadingButton>
                    </Form>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('password');
                        setSent(false);
                      }}
                      className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Use a password instead
                    </button>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
                }
              >
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        }
        end={<AuthShowcasePanel className="hidden h-full md:flex" />}
      />
    </main>
  );
}
