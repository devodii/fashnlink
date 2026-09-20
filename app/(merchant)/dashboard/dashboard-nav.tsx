'use client';

import { usePathname } from 'next/navigation';
import {
  SquaresFourIcon,
  LinkIcon,
  PackageIcon,
  UsersIcon,
  SparkleIcon,
  CreditCardIcon,
  GearIcon,
  EnvelopeIcon,
} from '@phosphor-icons/react/ssr';
import { AppShell, type NavItem } from '@/components/app-shell';

const BASE_ITEMS: Omit<NavItem, 'active'>[] = [
  { label: 'Overview', href: '/dashboard', icon: SquaresFourIcon },
  { label: 'Links', href: '/dashboard/links', icon: LinkIcon },
  { label: 'Products', href: '/dashboard/products', icon: PackageIcon },
  { label: 'Leads', href: '/dashboard/leads', icon: UsersIcon },
  { label: 'Model pack', href: '/dashboard/model-pack', icon: SparkleIcon },
  { label: 'Retargeting', href: '/dashboard/retargeting', icon: EnvelopeIcon },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { label: 'Settings', href: '/dashboard/settings', icon: GearIcon },
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
