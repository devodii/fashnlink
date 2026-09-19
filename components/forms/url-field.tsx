'use client';

import * as RHF from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface UrlFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// Trims whitespace and adds https:// when the value looks like a bare
// domain/path.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function UrlField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder,
  disabled,
  autoFocus,
}: UrlFieldProps<TValues, TName>) {
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
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={!!fieldState.error}
            {...field}
            value={(field.value as string | undefined) ?? ''}
            onBlur={(e) => {
              const normalized = normalizeUrl(e.target.value);
              if (normalized !== e.target.value) field.onChange(normalized);
              field.onBlur();
            }}
          />
        </FieldLayout>
      )}
    />
  );
}
