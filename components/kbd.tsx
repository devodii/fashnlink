import * as React from 'react';
import { cn } from 'cn';

export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}
