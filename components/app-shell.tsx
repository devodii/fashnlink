'use client';

import * as React from 'react';
import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';

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

export function AppShell({ nav, user, actions, footer, children }: AppShellProps) {
  return (
    <SidebarProvider className="min-h-dvh flex-col md:flex-row">
      <Sidebar collapsible="none" className="hidden w-56 shrink-0 border-r border-border md:flex">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={item.active}>
                      <a href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        {(footer || user) && (
          <SidebarFooter>
            {footer}
            {user}
          </SidebarFooter>
        )}
      </Sidebar>

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
    </SidebarProvider>
  );
}
