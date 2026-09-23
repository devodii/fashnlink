'use client';

import * as React from 'react';
import * as RHF from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import { Input } from '@/components/ui/input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface PasswordFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: 'current-password' | 'new-password';
}

export function PasswordField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder,
  disabled,
  autoComplete = 'current-password',
}: PasswordFieldProps<TValues, TName>) {
  const [visible, setVisible] = React.useState(false);

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
          <div className="relative">
            <Input
              id={name}
              type={visible ? 'text' : 'password'}
              autoComplete={autoComplete}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={!!fieldState.error}
              className="pr-9"
              {...field}
              value={(field.value as string | undefined) ?? ''}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              disabled={disabled}
              aria-label={visible ? 'Hide password' : 'Show password'}
              className={cn(
                'absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </FieldLayout>
      )}
    />
  );
}
