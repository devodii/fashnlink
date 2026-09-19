'use client';

import { useEffect, useRef } from 'react';

export function usePolling(
  fn: () => void | Promise<boolean | void>,
  intervalMs: number,
  enabled = true,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      const result = await fnRef.current();
      if (cancelled || result === false) return;
      timeoutId = setTimeout(tick, intervalMs);
    }

    timeoutId = setTimeout(tick, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [intervalMs, enabled]);
}
