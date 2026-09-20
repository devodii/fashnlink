import * as React from 'react';
import { cn } from 'cn';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      className={cn('flex items-center overflow-hidden', className)}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        'flex h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupInput };
