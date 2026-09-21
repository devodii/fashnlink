import * as React from 'react';
import { cn } from 'cn';
import type { Icon } from '@phosphor-icons/react';

export interface EmptyStateProps {
  icon: Icon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-8 text-center',
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
