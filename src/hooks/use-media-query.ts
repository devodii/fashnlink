'use client';

import { useSyncExternalStore } from 'react';

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

/** SSR-safe media query hook (section 2/10.4). Returns `false` on the server
 * and on first client render before hydration can read `matchMedia`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Convenience wrapper for the `md` breakpoint used throughout section 10.8
 * (ResponsiveDialog, DataTable mobileCard, FilterBar). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
