'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends React.ComponentProps<'header'> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}

/** Sticky on mobile with a compact mode once scrolled (section 10.4). */
export function PageHeader({ title, description, actions, breadcrumbs, className, ...props }: PageHeaderProps) {
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-10 -mx-4 space-y-2 border-b border-border bg-background px-4 py-4 transition-[padding] md:static md:mx-0 md:border-0 md:px-0',
        compact && 'py-2 md:py-4',
        className
      )}
      {...props}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.label}>
              {i > 0 && <ChevronRight className="size-3.5" />}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className={cn('font-medium text-foreground transition-[font-size]', compact ? 'text-lg' : 'text-2xl')}>
            {title}
          </h1>
          {description && !compact && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
