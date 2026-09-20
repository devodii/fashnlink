'use client';

import { usePathname } from 'next/navigation';
import {
  SquaresFour,
  Link,
  Package,
  Users,
  Sparkle,
  CreditCard,
  Gear,
  Envelope,
} from '@phosphor-icons/react/ssr';
import { AppShell, type NavItem } from '@/components/app-shell';

const BASE_ITEMS: Omit<NavItem, 'active'>[] = [
  { label: 'Overview', href: '/dashboard', icon: SquaresFour },
  { label: 'Links', href: '/dashboard/links', icon: Link },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Model pack', href: '/dashboard/model-pack', icon: Sparkle },
  { label: 'Retargeting', href: '/dashboard/retargeting', icon: Envelope },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Gear },
];

export function DashboardNav({
  children,
  actions,
  user,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  user: { name: string; email: string; logoUrl?: string | null };
}) {
  const pathname = usePathname();
  const nav: NavItem[] = BASE_ITEMS.map((item) => ({
    ...item,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  return (
    <AppShell nav={nav} actions={actions} user={user}>
      {children}
    </AppShell>
  );
}
