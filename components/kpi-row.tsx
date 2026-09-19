import * as React from 'react';
import { cn } from 'cn';
import { StatCard, type StatCardProps } from '@/components/stat-card';

export interface KpiRowProps {
  stats: StatCardProps[];
  className?: string;
}

export function KpiRow({ stats, className }: KpiRowProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
