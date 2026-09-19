'use client';

import * as RHF from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  options: SelectFieldOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
  placeholder = 'Select…',
  disabled,
}: SelectFieldProps<TValues, TName>) {
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
          <Select
            value={(field.value as string | undefined) ?? ''}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger id={name} aria-invalid={!!fieldState.error} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLayout>
      )}
    />
  );
}
