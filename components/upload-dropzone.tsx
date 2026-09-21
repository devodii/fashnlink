'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ImageIcon, ArrowUpIcon, WarningIcon, XIcon } from '@phosphor-icons/react/ssr';
import { generateReactHelpers } from '@uploadthing/react';
import type { UploadRouter } from '@/lib/uploadthing';
import { Spinner } from '@/components/spinner';

const { useUploadThing } = generateReactHelpers<UploadRouter>();

export interface UploadedFile {
  url: string;
  key: string;
  name: string;
}

const ASPECT_CLASS = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
} as const;

export interface UploadDropzoneProps {
  accept?: string;
  maxSizeMb?: number;
  capture?: 'user' | 'environment';
  multiple?: boolean;
  aspect?: keyof typeof ASPECT_CLASS;
  disabled?: boolean;
  onFiles: (files: UploadedFile[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
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
  aspect = '3/4',
  disabled,
  onFiles,
  onUploadingChange,
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
  const [simulatedProgress, setSimulatedProgress] = React.useState<number | null>(null);
  const simulatedTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  function stopSimulatedProgress() {
    if (simulatedTimerRef.current) clearInterval(simulatedTimerRef.current);
    simulatedTimerRef.current = null;
    setSimulatedProgress(null);
  }

  function startSimulatedProgress() {
    setSimulatedProgress(0);
    simulatedTimerRef.current = setInterval(() => {
      setSimulatedProgress((p) => (p === null ? null : Math.min(p + (90 - p) * 0.08, 89)));
    }, 200);
  }

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: (res) => {
      setUploadProgress(null);
      stopSimulatedProgress();
      onFiles(res.map((file) => ({ url: file.ufsUrl, key: file.key, name: file.name })));
    },
    onUploadError: (uploadError) => {
      setUploadProgress(null);
      stopSimulatedProgress();
      setLocalError(uploadError.message);
    },
  });

  React.useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  React.useEffect(() => () => stopSimulatedProgress(), []);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const tooBig = files.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setLocalError(`That file is over ${maxSizeMb}MB. Try a smaller one.`);
      return;
    }
    setLocalError(null);
    setLocalPreview(URL.createObjectURL(files[0]));
    startSimulatedProgress();
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
  const liveProgress =
    uploadProgress !== null || simulatedProgress !== null
      ? Math.max(uploadProgress ?? 0, simulatedProgress ?? 0)
      : null;
  const displayProgress = progressProp ?? liveProgress;
  const isLoading = isUploading || (displayProgress !== null && displayProgress < 100);

  return (
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'relative flex w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md border border-dashed bg-muted/40 text-muted-foreground transition-colors',
          ASPECT_CLASS[aspect],
          !displayPreview && !displayError && 'border-input hover:border-ring hover:bg-accent',
          dragActive && 'border-primary bg-primary/5 text-primary',
          displayError && 'border-destructive/50 bg-destructive/5 text-destructive',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {displayPreview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayPreview} alt="" className="absolute inset-0 size-full object-cover" />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/70 text-foreground">
                <Spinner size={24} />
                {displayProgress !== null && (
                  <span className="text-xs font-medium">{Math.round(displayProgress)}%</span>
                )}
              </div>
            )}
            {!isLoading && (
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
                <XIcon className="size-4" />
              </span>
            )}
          </>
        ) : displayError ? (
          <>
            <WarningIcon className="size-6" />
            <span className="px-4 text-center text-sm font-medium">{displayError}</span>
            <span className="text-xs">
              Drag an image here or <span className="underline">browse</span>
            </span>
          </>
        ) : dragActive ? (
          <>
            <ArrowUpIcon className="size-6" />
            <span className="text-sm">
              Drop to <span className="font-semibold">upload</span>
            </span>
          </>
        ) : (
          <>
            <ImageIcon className="size-6" />
            <span className="text-sm">
              Drag an image here or <span className="font-medium text-foreground">browse</span>
            </span>
            <span className="text-xs">PNG or JPG, up to {maxSizeMb}MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
