'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ImageIcon, Loader2, UploadCloud, X } from 'lucide-react';

export interface UploadDropzoneProps {
  accept?: string;
  maxSizeMb?: number;
  capture?: 'user' | 'environment';
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  preview?: string | null;
  progress?: number | null;
  error?: string | null;
  className?: string;
}

/** Section 10.4: selfie, logo, manual-product, and size-chart uploads all use
 * this. `capture="user"` (section 8.3) opens the front camera on mobile. */
export function UploadDropzone({
  accept = 'image/*',
  maxSizeMb = 10,
  capture,
  multiple = false,
  onFiles,
  preview,
  progress,
  error,
  className,
}: UploadDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const tooBig = files.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setLocalError(`${tooBig.name} is over ${maxSizeMb}MB`);
      return;
    }
    setLocalError(null);
    onFiles(files);
  }

  const displayError = error ?? localError;
  const isLoading = progress !== undefined && progress !== null && progress < 100;

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
          dragActive && 'border-ring bg-accent'
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            {isLoading ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
            <span className="px-4 text-center text-sm">Tap to upload, or drag a photo here</span>
          </>
        )}
        {isLoading && preview && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        {preview && !isLoading && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onFiles([]);
            }}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
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
      {!preview && !displayError && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="size-3" /> up to {maxSizeMb}MB
        </p>
      )}
    </div>
  );
}
