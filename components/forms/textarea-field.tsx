'use client';

import * as RHF from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface TextareaFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function TextareaField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder,
  rows = 4,
  disabled,
}: TextareaFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldLayout htmlFor={name} label={label} description={description} error={fieldState.error} className={className}>
          <Textarea
            id={name}
            placeholder={placeholder}
            rows={rows}
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
