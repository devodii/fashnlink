'use client';

import * as React from 'react';
import * as RHF from 'react-hook-form';
import { cn } from 'cn';
import { InlineAlert } from '@/components/inline-alert';
import type { AppError, Result } from '@/lib/result';

export interface FormProps<TValues extends RHF.FieldValues> {
  form: RHF.UseFormReturn<TValues>;
  onSubmit: (values: TValues) => Promise<Result<unknown, AppError> | void>;
  children: React.ReactNode;
  className?: string;
}

/**
 * A server action signals a field-level error by setting
 * `error.meta.fieldErrors: Record<string, string>` on the returned
 * `AppError`; anything else surfaces as one root `InlineAlert`.
 */
export function Form<TValues extends RHF.FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProps<TValues>) {
  const rootError = form.formState.errors.root?.message;

  async function handle(values: TValues) {
    const result = await onSubmit(values);
    if (!result || result.ok) return;

    const fieldErrors = result.error.meta?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      let mapped = false;
      for (const [field, message] of Object.entries(fieldErrors as Record<string, string>)) {
        form.setError(field as RHF.Path<TValues>, { message });
        mapped = true;
      }
      if (mapped) return;
    }

    form.setError('root' as RHF.Path<TValues>, { message: result.error.message });
  }

  return (
    <form onSubmit={form.handleSubmit(handle)} noValidate className={cn('space-y-4', className)}>
      <fieldset
        disabled={form.formState.isSubmitting}
        className="m-0 min-w-0 space-y-4 border-0 p-0"
      >
        {rootError && <InlineAlert tone="destructive">{rootError}</InlineAlert>}
        {children}
      </fieldset>
    </form>
  );
}
