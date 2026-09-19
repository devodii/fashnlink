import * as React from 'react';
import { cn } from 'cn';
import type { Tone } from '@/components/dot';

export interface StatusBadgeMapEntry {
  label: string;
  tone: Tone;
}

export interface StatusBadgeProps {
  status: string;
  map: Record<string, StatusBadgeMapEntry>;
  className?: string;
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
};

/** Section 10.4: `status` (a raw enum value from the DB, e.g. `renders.status`)
 * maps to a display label + tone via the caller-supplied `map` — tone is
 * always a token color, never a raw class chosen inline per call site. */
export function StatusBadge({ status, map, className }: StatusBadgeProps) {
  const entry = map[status];
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[entry?.tone ?? 'neutral'],
        className
      )}
    >
      {entry?.label ?? status}
    </span>
  );
}
