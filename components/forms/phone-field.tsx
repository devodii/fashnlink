'use client';

import * as RHF from 'react-hook-form';
import {
  PhoneNumberField,
  phoneNumberFromString,
  phoneNumberToString,
} from '@/components/phone-number-field';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface PhoneFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  disabled?: boolean;
}

export function PhoneField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  disabled,
}: PhoneFieldProps<TValues, TName>) {
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
          <PhoneNumberField
            id={name}
            disabled={disabled}
            value={phoneNumberFromString((field.value as string | undefined) ?? '')}
            onChange={(next) => field.onChange(phoneNumberToString(next))}
          />
        </FieldLayout>
      )}
    />
  );
}
