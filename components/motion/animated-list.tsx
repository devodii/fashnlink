'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from 'cn';

export interface AnimatedListProps {
  items: React.ReactNode[];
  intervalMs?: number;
  maxVisible?: number;
  className?: string;
  itemClassName?: string;
}

export function AnimatedList({
  items,
  intervalMs = 1500,
  maxVisible = 4,
  className,
  itemClassName,
}: AnimatedListProps) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = React.useState(reduceMotion ? Math.min(maxVisible, items.length) : 1);

  React.useEffect(() => {
    if (reduceMotion || items.length <= 1) return;
    const id = setInterval(() => {
      setCount((c) => (c >= items.length ? 1 : c + 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs, reduceMotion]);

  const visible = items.slice(Math.max(0, count - maxVisible), count).reverse();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <AnimatePresence initial={false}>
        {visible.map((item, i) => (
          <motion.div
            key={`${count}-${i}`}
            layout
            initial={reduceMotion ? false : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className={itemClassName}
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
