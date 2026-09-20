'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Icon } from '@phosphor-icons/react';
import { SignOutIcon } from '@phosphor-icons/react/ssr';
import { authClient } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  active?: boolean;
}

export interface AppShellProps {
  nav: NavItem[];
  user?: { name: string; email: string; logoUrl?: string | null };
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function SidebarUserMenu({ name, email, logoUrl }: NonNullable<AppShellProps['user']>) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent">
          <Avatar size="sm">
            {logoUrl && <AvatarImage src={logoUrl} alt={name} />}
            <AvatarFallback>{initials(name, email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{name}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuItem onClick={handleSignOut}>
          <SignOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ nav, user, actions, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
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
        {user && (
          <SidebarFooter>
            <SidebarUserMenu {...user} />
          </SidebarFooter>
        )}
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-6">
          <SidebarTrigger />
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
