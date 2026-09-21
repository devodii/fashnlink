'use client';

import * as React from 'react';
import * as RHF from 'react-hook-form';
import type { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';

/** Generic single-field form wrapper for field-component stories: each
 * `RHF.Controller`-based field needs a real `control` from a real form, so
 * this is the one place that boilerplate lives instead of fifteen copies. */
export function FieldStory<TValues extends RHF.FieldValues>({
  schema,
  defaultValues,
  children,
}: {
  schema: z.ZodType<TValues, TValues>;
  defaultValues: TValues;
  children: (control: RHF.Control<TValues>) => React.ReactNode;
}) {
  // Same friction as useZodForm's own zodResolver cast (see its DECISION
  // comment): RHF's DefaultValues<T> is a deep-partial mapped type that
  // doesn't structurally accept a plain TValues through a generic parameter,
  // even though a fully-populated TValues is always a valid DefaultValues<T>.
  const form = useZodForm(schema, {
    defaultValues: defaultValues as RHF.DefaultValues<TValues>,
  });
  return <form className="max-w-sm space-y-4">{children(form.control)}</form>;
}
