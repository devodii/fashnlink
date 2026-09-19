'use client';

import * as RHF from 'react-hook-form';
import { cn } from 'cn';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { FieldProps } from './types';

export interface CheckboxFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  disabled?: boolean;
}

/** Consent/age-attestation checkboxes (section 8.3, 9.8) are `CheckboxField`
 * instances — label sits beside the box, not above it, so it reads as one
 * sentence. */
export function CheckboxField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  disabled,
}: CheckboxFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn('space-y-1.5', className)}>
          <div className="flex items-start gap-2">
            <Checkbox
              id={name}
              checked={!!field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              disabled={disabled}
              aria-invalid={!!fieldState.error}
              className="mt-0.5"
            />
            <Label htmlFor={name} className="leading-snug font-normal">
              {label}
            </Label>
          </div>
          {description && !fieldState.error && (
            <p className="pl-6 text-sm text-muted-foreground">{description}</p>
          )}
          {fieldState.error && (
            <p className="pl-6 text-sm text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
}
