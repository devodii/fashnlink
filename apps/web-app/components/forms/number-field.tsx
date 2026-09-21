'use client';

import * as RHF from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface NumberFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder,
  min,
  max,
  step,
  disabled,
}: NumberFieldProps<TValues, TName>) {
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
            type="number"
            inputMode="decimal"
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            onChange={(e) => {
              const raw = e.target.value;
              field.onChange(raw === '' ? undefined : Number(raw));
            }}
          />
        </FieldLayout>
      )}
    />
  );
}
