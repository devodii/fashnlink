'use client';

import * as React from 'react';
import { cn } from 'cn';

export interface ImageCompareProps {
  before: string;
  after: string;
  alt: string;
  className?: string;
}

/** Section 10.4: before/after with a drag handle — marketing demo and render
 * detail. */
export function ImageCompare({ before, after, alt, className }: ImageCompareProps) {
  const [position, setPosition] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[3/4] w-full overflow-hidden rounded-md bg-muted select-none',
        className,
      )}
      onPointerDown={(e) => {
        draggingRef.current = true;
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) updateFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={alt} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={alt} className="absolute inset-0 size-full object-cover" />
      </div>
      <div
        className="absolute inset-y-0 w-0.5 bg-background shadow-sm"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm">
          <div className="h-3 w-0.5 rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
