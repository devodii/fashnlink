'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { PasswordField } from '@/components/forms/password-field';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';
import { authClient } from '@/lib/auth-client';
import { ok, err, type Result, type AppError } from '@/lib/result';

const schema = z.object({ password: z.string().min(8, 'Use at least 8 characters') });
type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const form = useZodForm(schema, { defaultValues: { password: '' } });

  async function handleSubmit({ password }: Values): Promise<Result<undefined, AppError>> {
    if (!token) {
      return err({ code: 'INVALID_INPUT', message: 'This reset link is invalid or expired.' });
    }
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      return err({
        code: 'INVALID_INPUT',
        message: error.message || 'This reset link is invalid or expired.',
      });
    }
    toast.success('Password updated. Sign in with your new password.');
    router.push('/login');
    return ok(undefined);
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="destructive" dismissible={false}>
          This reset link is invalid or has expired.
        </InlineAlert>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <PasswordField
        control={form.control}
        name="password"
        label="New password"
        autoComplete="new-password"
        description="At least 8 characters"
      />
      <LoadingButton type="submit" loading={form.formState.isSubmitting} className="w-full">
        Reset password
      </LoadingButton>
    </Form>
  );
}
