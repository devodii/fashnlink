import * as React from 'react';
import { cn } from 'cn';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react/ssr';
import { CountUp } from '@/components/count-up';
import { Skeleton } from '@/components/ui/skeleton';

export interface StatCardProps {
  label: string;
  value: number;
  formatter?: (value: number) => string;
  delta?: number;
  hint?: string;
  loading?: boolean;
  className?: string;
}

// `delta` is a plain percentage number (positive = up); sign/color are
// derived, not passed in.
export function StatCard({
  label,
  value,
  formatter,
  delta,
  hint,
  loading,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn('space-y-2 rounded-md border border-border p-4', className)}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-16" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-1 rounded-md border border-border p-4', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-medium text-foreground">
          <CountUp value={value} formatter={formatter} />
        </p>
        {delta !== undefined && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              delta >= 0 ? 'text-success' : 'text-destructive',
            )}
          >
            {delta >= 0 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatCardRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCard key={i} label="" value={0} loading />
      ))}
    </div>
  );
}
