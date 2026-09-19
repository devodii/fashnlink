import * as React from 'react';
import { cn } from 'cn';

export interface SectionProps extends React.ComponentProps<'section'> {
  title?: string;
  description?: string;
  aside?: React.ReactNode;
}

/** Vertical rhythm owner (section 10.4): pages are stacks of `Section`. */
export function Section({ title, description, aside, className, children, ...props }: SectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {(title || description || aside) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {title && <h2 className="text-lg font-medium text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {aside && <div>{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
