import * as React from 'react';
import { cn } from 'cn';

export interface PhoneFrameProps {
  src?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PhoneFrame({ src, children, className }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        'mx-auto aspect-[9/19.5] w-full max-w-70 overflow-hidden rounded-3xl border-4 border-border bg-background',
        className,
      )}
    >
      {src ? <iframe src={src} title="Preview" className="size-full border-0" /> : children}
    </div>
  );
}
