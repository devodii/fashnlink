'use client';

import * as RHF from 'react-hook-form';
import { UploadDropzone, type UploadedFile } from '@/components/upload-dropzone';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface FileFieldProps<
  TValues extends RHF.FieldValues,
  TName extends RHF.Path<TValues>,
> extends FieldProps<TValues, TName> {
  accept?: string;
  maxSizeMb?: number;
  capture?: 'user' | 'environment';
}

/** Wraps `UploadDropzone` (section 10.4) for RHF forms. `UploadDropzone` owns
 * the actual upload (UploadThing, client-to-storage), so the field value is
 * the uploaded result (`UploadedFile | undefined`), not a raw `File`. */
export function FileField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  accept,
  maxSizeMb,
  capture,
}: FileFieldProps<TValues, TName>) {
  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const file = field.value as UploadedFile | undefined;
        return (
          <FieldLayout
            htmlFor={name}
            label={label}
            description={description}
            error={fieldState.error}
            className={className}
          >
            <UploadDropzone
              accept={accept}
              maxSizeMb={maxSizeMb}
              capture={capture}
              preview={file?.url ?? null}
              onFiles={(files) => field.onChange(files[0])}
            />
          </FieldLayout>
        );
      }}
    />
  );
}
