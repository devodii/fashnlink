'use client';

import * as RHF from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface DateFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  min?: string;
  max?: string;
  disabled?: boolean;
}

export function DateField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  min,
  max,
  disabled,
}: DateFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldLayout
          htmlFor={name}
          label={label}
          description={description}
          error={fieldState.error}
          className={className}
        >
          <Input
            id={name}
            type="date"
            min={min}
            max={max}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={(field.value as string | undefined) ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
          />
        </FieldLayout>
      )}
    />
  );
}
