'use client';

import * as React from 'react';
import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface AppShellProps {
  nav: NavItem[];
  user?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Section 10.4: sidebar on desktop, bottom tab bar on mobile. `nav` items
 * decide their own `active` state (the shell doesn't know about routing). */
export function AppShell({ nav, user, actions, footer, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 md:flex">
        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                item.active && 'bg-secondary text-secondary-foreground',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </a>
          ))}
        </nav>
        {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
        {user && <div className="mt-4 border-t border-border pt-4">{user}</div>}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {actions && (
          <div className="hidden items-center justify-end gap-2 border-b border-border px-6 py-3 md:flex">
            {actions}
          </div>
        )}
        <main className="flex-1 px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-border bg-background py-1 md:hidden">
        {nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-w-11 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground',
              item.active && 'text-foreground',
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
