'use client';

import * as React from 'react';
import { useReducedMotion } from 'framer-motion';

export interface NumberTickerProps {
  value: number;
  durationMs?: number;
  formatter?: (value: number) => string;
  className?: string;
}

/** Section 10.6: powers `CountUp`. Collapses to an instant set under reduced
 * motion instead of animating the count. */
export function NumberTicker({ value, durationMs = 600, formatter, className }: NumberTickerProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(reduceMotion ? value : 0);
  const fromRef = React.useRef(0);

  React.useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(from + (value - from) * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduceMotion]);

  // Section 10.7 mitigation #2: text that changes after mount is marked
  // `translate="no"` so Google's widget doesn't fight React over this node
  // on every tick.
  return (
    <span className={className} translate="no">
      {formatter ? formatter(display) : display.toLocaleString()}
    </span>
  );
}
