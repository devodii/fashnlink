'use client';

import * as React from 'react';
import * as RHF from 'react-hook-form';
import { UploadDropzone } from '@/components/upload-dropzone';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface FileFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  accept?: string;
  maxSizeMb?: number;
  capture?: 'user' | 'environment';
}

function FilePreview({
  file,
  accept,
  maxSizeMb,
  capture,
  onFiles,
}: {
  file: File | undefined;
  accept?: string;
  maxSizeMb?: number;
  capture?: 'user' | 'environment';
  onFiles: (files: File[]) => void;
}) {
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <UploadDropzone accept={accept} maxSizeMb={maxSizeMb} capture={capture} preview={preview} onFiles={onFiles} />;
}

/** Wraps `UploadDropzone` (section 10.4) for RHF forms. Field value is a
 * single `File | undefined`; `UploadDropzone`'s `multiple` mode isn't wired
 * here since every spec use case (selfie, logo, size chart) is one file. */
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
      render={({ field, fieldState }) => (
        <FieldLayout htmlFor={name} label={label} description={description} error={fieldState.error} className={className}>
          <FilePreview
            file={field.value as File | undefined}
            accept={accept}
            maxSizeMb={maxSizeMb}
            capture={capture}
            onFiles={(files) => field.onChange(files[0])}
          />
        </FieldLayout>
      )}
    />
  );
}
