import * as React from 'react';
import { cn } from 'cn';
import { Dot, type Tone } from '@/components/dot';

export interface TimelineItem {
  at: string;
  title: string;
  description?: string;
  tone?: Tone;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('space-y-4', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Dot tone={item.tone} className="mt-1.5" />
            {i < items.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">{item.at}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
