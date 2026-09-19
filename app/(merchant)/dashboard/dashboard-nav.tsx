'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Link2,
  Package,
  Users,
  Sparkles,
  CreditCard,
  Settings,
  Mail,
} from 'lucide-react';
import { AppShell, type NavItem } from '@/components/app-shell';

const BASE_ITEMS: Omit<NavItem, 'active'>[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Links', href: '/dashboard/links', icon: Link2 },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Model pack', href: '/dashboard/model-pack', icon: Sparkles },
  { label: 'Retargeting', href: '/dashboard/retargeting', icon: Mail },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

/**
 * `AppShell` deliberately doesn't know about routing; this
 * is the one client island that computes `active` from the real pathname
 * and feeds it in, per the component's own contract.
 */
export function DashboardNav({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav: NavItem[] = BASE_ITEMS.map((item) => ({
    ...item,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  return (
    <AppShell nav={nav} actions={actions}>
      {children}
    </AppShell>
  );
}
