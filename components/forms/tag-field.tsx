'use client';

import * as RHF from 'react-hook-form';
import { TagInput } from '@/components/tag-input';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface TagFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  placeholder?: string;
}

export function TagField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  placeholder,
}: TagFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldLayout htmlFor={name} label={label} description={description} error={fieldState.error} className={className}>
          <TagInput value={Array.isArray(field.value) ? field.value : []} onChange={field.onChange} placeholder={placeholder} />
        </FieldLayout>
      )}
    />
  );
}
