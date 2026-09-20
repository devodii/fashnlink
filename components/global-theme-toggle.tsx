'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * The dashboard shell already renders its own ThemeToggle in the sidebar
 * header, positioned next to the sidebar trigger. Everywhere else (the
 * marketing site, auth pages, shopper-facing try-on pages) has no shared
 * shell, so this renders one fixed toggle for all of it, hidden on
 * /dashboard routes to avoid showing two at once.
 */
export function GlobalThemeToggle() {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <ThemeToggle className="fixed top-4 right-4 z-50 bg-background/80 shadow-sm backdrop-blur" />
  );
}
