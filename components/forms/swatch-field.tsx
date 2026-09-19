'use client';

import * as RHF from 'react-hook-form';
import { SwatchPicker, type SwatchOption } from '@/components/swatch-picker';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface SwatchFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  options: SwatchOption[];
}

export function SwatchField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
}: SwatchFieldProps<TValues, TName>) {
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
          <SwatchPicker
            options={options}
            value={field.value as string | undefined}
            onChange={field.onChange}
          />
        </FieldLayout>
      )}
    />
  );
}
