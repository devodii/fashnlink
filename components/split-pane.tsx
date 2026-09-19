import * as React from 'react';
import { cn } from 'cn';

const RATIO_CLASS = {
  '1:1': 'md:grid-cols-2',
  '1:2': 'md:grid-cols-[1fr_2fr]',
  '2:1': 'md:grid-cols-[2fr_1fr]',
} as const;

export interface SplitPaneProps extends React.ComponentProps<'div'> {
  ratio?: keyof typeof RATIO_CLASS;
  start: React.ReactNode;
  end: React.ReactNode;
}

export function SplitPane({ ratio = '1:1', start, end, className, ...props }: SplitPaneProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6', RATIO_CLASS[ratio], className)} {...props}>
      <div>{start}</div>
      <div>{end}</div>
    </div>
  );
}
