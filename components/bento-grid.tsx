import * as React from 'react';
import { cn } from 'cn';
import { Card } from '@/components/ui/card';

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2', className)}>
      {children}
    </div>
  );
}

export interface BentoCardProps extends React.ComponentProps<'div'> {
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
}

const COL_SPAN_CLASS = { 1: '', 2: 'md:col-span-2', 3: 'md:col-span-3' } as const;
const ROW_SPAN_CLASS = { 1: '', 2: 'md:row-span-2' } as const;

export function BentoCard({
  colSpan = 1,
  rowSpan = 1,
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <Card
      className={cn(
        'gap-4 p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5',
        COL_SPAN_CLASS[colSpan],
        ROW_SPAN_CLASS[rowSpan],
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
