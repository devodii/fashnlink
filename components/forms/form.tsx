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

// DECISION: section 10.5 says server-returned `AppError` maps to `setError`
// on the matching field or, otherwise, to a root error rendered via
// `InlineAlert`. The spec's `AppError` (section 4) doesn't define a fixed
// field-error shape, so the convention here is `error.meta.fieldErrors:
// Record<string, string>` — a server action that wants a field-level message
// (e.g. "email already in use") sets that key; anything else surfaces as one
// root `InlineAlert`.
export function Form<TValues extends RHF.FieldValues>({ form, onSubmit, children, className }: FormProps<TValues>) {
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
      <fieldset disabled={form.formState.isSubmitting} className="space-y-4 border-0 p-0 m-0 min-w-0">
        {rootError && <InlineAlert tone="destructive">{rootError}</InlineAlert>}
        {children}
      </fieldset>
    </form>
  );
}
