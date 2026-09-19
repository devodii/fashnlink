'use client';

import * as RHF from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface EmailFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  placeholder?: string;
  disabled?: boolean;
}

export function EmailField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder = 'you@example.com',
  disabled,
}: EmailFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldLayout htmlFor={name} label={label} description={description} error={fieldState.error} className={className}>
          <Input
            id={name}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            {...field}
            value={(field.value as string | undefined) ?? ''}
          />
        </FieldLayout>
      )}
    />
  );
}
