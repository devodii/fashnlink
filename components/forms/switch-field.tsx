'use client';

import * as RHF from 'react-hook-form';
import { cn } from 'cn';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { FieldProps } from './types';

export interface SwitchFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  disabled?: boolean;
}

/** Retargeting opt-in/opt-out toggles (section 9.8, `/me`) are `SwitchField`.
 * Never rendered pre-ticked; that's a caller-side rule (defaultValues), not
 * something this component can enforce. */
export function SwitchField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  disabled,
}: SwitchFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn('flex items-center justify-between gap-3', className)}>
          <div className="space-y-0.5">
            <Label htmlFor={name} className="font-normal">
              {label}
            </Label>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Switch
            id={name}
            checked={!!field.value}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            disabled={disabled}
          />
        </div>
      )}
    />
  );
}
