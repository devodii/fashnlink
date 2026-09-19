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

export function StatusBadge({ status, map, className }: StatusBadgeProps) {
  const entry = map[status];
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[entry?.tone ?? 'neutral'],
        className,
      )}
    >
      {entry?.label ?? status}
    </span>
  );
}
