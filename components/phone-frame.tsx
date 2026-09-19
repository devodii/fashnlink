import * as React from 'react';
import { cn } from 'cn';

export interface PhoneFrameProps {
  src?: string;
  children?: React.ReactNode;
  className?: string;
}

/** wraps children (or an iframe `src`) in a phone bezel, scales
 * to its container. Used for the merchant's link preview. */
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
