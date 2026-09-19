'use client';

import * as RHF from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface RadioGroupFieldOption {
  value: string;
  label: string;
}

export interface RadioGroupFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  options: RadioGroupFieldOption[];
  disabled?: boolean;
}

export function RadioGroupField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
  disabled,
}: RadioGroupFieldProps<TValues, TName>) {
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
          <RadioGroup
            value={(field.value as string | undefined) ?? ''}
            onValueChange={field.onChange}
            disabled={disabled}
            className="gap-2"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FieldLayout>
      )}
    />
  );
}
