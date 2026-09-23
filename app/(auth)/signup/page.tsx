'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { TextField } from '@/components/forms/text-field';
import { EmailField } from '@/components/forms/email-field';
import { PasswordField } from '@/components/forms/password-field';
import { LoadingButton } from '@/components/loading-button';
import { SplitPane } from '@/components/split-pane';
import { AuthShowcasePanel } from '@/components/auth-showcase-panel';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { ok, err, type Result, type AppError } from '@/lib/result';

const schema = z.object({
  name: z.string().min(1, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
type Values = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const form = useZodForm(schema, { defaultValues: { name: '', email: '', password: '' } });

  async function handleSubmit({
    name,
    email,
    password,
  }: Values): Promise<Result<undefined, AppError>> {
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      return err({
        code: 'CONFLICT',
        message: error.message || 'Could not create your account. Try again.',
      });
    }
    router.push('/dashboard');
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
                <h1 className="text-lg font-medium text-foreground">Create your account</h1>
                <p className="text-sm text-muted-foreground">Start sending try-on links</p>
              </div>

              <Form form={form} onSubmit={handleSubmit}>
                <TextField
                  control={form.control}
                  name="name"
                  label="Name"
                  placeholder="Ada Lovelace"
                />
                <EmailField
                  control={form.control}
                  name="email"
                  label="Email"
                  placeholder="you@shop.com"
                />
                <PasswordField
                  control={form.control}
                  name="password"
                  label="Password"
                  autoComplete="new-password"
                  description="At least 8 characters"
                />
                <LoadingButton
                  type="submit"
                  loading={form.formState.isSubmitting}
                  className="w-full"
                >
                  Create account
                </LoadingButton>
              </Form>

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
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Sign in
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
