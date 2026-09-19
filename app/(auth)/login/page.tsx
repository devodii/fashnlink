'use client';

import * as React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { EmailField } from '@/components/forms/email-field';
import { LoadingButton } from '@/components/loading-button';
import { Container } from '@/components/container';
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
    <main className="flex flex-1 items-center justify-center bg-background">
      <Container size="sm" className="flex flex-col items-center gap-6 py-16">
        <h1 className="text-lg font-medium text-foreground">Sign in</h1>

        {sent ? (
          <p className="text-sm text-muted-foreground">Check your email for a sign-in link.</p>
        ) : (
          <Form form={form} onSubmit={handleSubmit} className="w-full max-w-xs">
            <EmailField
              control={form.control}
              name="email"
              label="Email"
              placeholder="you@shop.com"
            />
            <LoadingButton type="submit" loading={form.formState.isSubmitting} className="w-full">
              Send magic link
            </LoadingButton>
          </Form>
        )}

        <Button
          variant="secondary"
          className="w-full max-w-xs"
          onClick={() =>
            authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
          }
        >
          Continue with Google
        </Button>
      </Container>
    </main>
  );
}
