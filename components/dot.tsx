import * as React from 'react';
import { cn } from 'cn';

export type Tone = 'neutral' | 'success' | 'warning' | 'destructive';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export interface DotProps extends React.ComponentProps<'span'> {
  tone?: Tone;
}

/** Section 10.4: small status token — a bare colored dot for the cases too
 * small for a `StatusBadge` (a `DataTable` cell, a list row). */
export function Dot({ tone = 'neutral', className, ...props }: DotProps) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', TONE_CLASS[tone], className)} {...props} />;
}
