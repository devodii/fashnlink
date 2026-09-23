'use client';

import * as React from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from 'cn';

export interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLElement | null>;
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  durationSeconds?: number;
  className?: string;
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  durationSeconds = 3,
  className,
}: AnimatedBeamProps) {
  const reduceMotion = useReducedMotion();
  const [path, setPath] = React.useState('');
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    function update() {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;

      const containerRect = container.getBoundingClientRect();
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();

      const startX = fromRect.left + fromRect.width / 2 - containerRect.left;
      const startY = fromRect.top + fromRect.height / 2 - containerRect.top;
      const endX = toRect.left + toRect.width / 2 - containerRect.left;
      const endY = toRect.top + toRect.height / 2 - containerRect.top;

      setSize({ width: containerRect.width, height: containerRect.height });
      setPath(`M ${startX} ${startY} L ${endX} ${endY}`);
    }

    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef, fromRef, toRef]);

  if (!path) return null;

  return (
    <svg
      className={cn('pointer-events-none absolute inset-0', className)}
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      fill="none"
      aria-hidden
    >
      <path d={path} className="stroke-border" strokeWidth={2} />
      <path
        d={path}
        className={cn('stroke-foreground', !reduceMotion && 'animate-beam-dash')}
        strokeWidth={2}
        strokeDasharray="8 10"
        style={reduceMotion ? undefined : { animationDuration: `${durationSeconds}s` }}
      />
    </svg>
  );
}
