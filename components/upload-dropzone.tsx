'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Image as ImageIcon, CloudArrowUp, X } from '@phosphor-icons/react';
import { Spinner } from '@/components/spinner';
import { useUploadThing } from '@/lib/uploadthing-client';

export interface UploadedFile {
  url: string;
  key: string;
  name: string;
}

export interface UploadDropzoneProps {
  accept?: string;
  maxSizeMb?: number;
  capture?: 'user' | 'environment';
  multiple?: boolean;
  onFiles: (files: UploadedFile[]) => void;
  preview?: string | null;
  progress?: number | null;
  error?: string | null;
  className?: string;
}

export function UploadDropzone({
  accept = 'image/*',
  maxSizeMb = 10,
  capture,
  multiple = false,
  onFiles,
  preview,
  progress: progressProp,
  error: errorProp,
  className,
}: UploadDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: (res) => {
      setUploadProgress(null);
      onFiles(res.map((file) => ({ url: file.ufsUrl, key: file.key, name: file.name })));
    },
    onUploadError: (uploadError) => {
      setUploadProgress(null);
      setLocalError(uploadError.message);
    },
  });

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const tooBig = files.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setLocalError(`${tooBig.name} is over ${maxSizeMb}MB`);
      return;
    }
    setLocalError(null);
    setLocalPreview(URL.createObjectURL(files[0]));
    void startUpload(files);
  }

  React.useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const displayPreview = preview ?? localPreview;
  const displayError = errorProp ?? localError;
  const displayProgress = progressProp ?? uploadProgress;
  const isLoading = isUploading || (displayProgress !== null && displayProgress < 100);

  return (
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed border-border bg-muted text-muted-foreground transition-colors',
          dragActive && 'border-ring bg-accent',
        )}
      >
        {displayPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayPreview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            {isLoading ? <Spinner size={24} /> : <CloudArrowUp className="size-6" />}
            <span className="px-4 text-center text-sm">Tap to upload, or drag a photo here</span>
          </>
        )}
        {isLoading && displayPreview && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Spinner size={24} />
          </div>
        )}
        {displayPreview && !isLoading && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setLocalPreview(null);
              onFiles([]);
            }}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
          >
            <X className="size-4" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {displayError && <p className="text-sm text-destructive">{displayError}</p>}
      {!displayPreview && !displayError && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="size-3" /> up to {maxSizeMb}MB
        </p>
      )}
    </div>
  );
}
