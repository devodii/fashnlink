'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguagePicker } from '@/components/language-picker';

/**
 * The dashboard shell already renders its own ThemeToggle in the sidebar
 * header, so this hides on /dashboard routes to avoid showing two at once.
 * LanguagePicker only applies to the shopper try-on flow (/t/[slug]) and is
 * rendered here rather than duplicated per-flow: both need the same
 * top-right corner, and duplicating meant the flow's own in-container
 * instance would stack directly on top of this fixed one.
 */
export function GlobalTopBar() {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) return null;

  const showLanguagePicker = pathname.startsWith('/t/');

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {showLanguagePicker && <LanguagePicker compact />}
      <ThemeToggle className="bg-background/80 shadow-sm backdrop-blur" />
    </div>
  );
}
