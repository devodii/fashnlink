'use client';

import * as RHF from 'react-hook-form';
import { SegmentedControl, type SegmentedOption } from '@/components/segmented-control';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface SegmentedFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  options: SegmentedOption[];
}

export function SegmentedField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
}: SegmentedFieldProps<TValues, TName>) {
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
          <SegmentedControl
            options={options}
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
          />
        </FieldLayout>
      )}
    />
  );
}
