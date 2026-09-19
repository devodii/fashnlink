'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const STEP_MS = 0.04;
const CAPPED_CHILDREN = 8;

export interface StaggerProps {
  children: React.ReactNode;
  className?: string;
}

/** list entrances, 40ms step, capped at 8 children (the rest
 * appear instantly instead of queuing a long stagger). Wrap each item in
 * `StaggerItem`. */
export function Stagger({ children, className }: StaggerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduceMotion ? 0 : STEP_MS } },
      }}
      className={className}
    >
      {React.Children.map(children, (child, i) => (
        <StaggerItem key={i} index={i}>
          {child}
        </StaggerItem>
      ))}
    </motion.div>
  );
}

export interface StaggerItemProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function StaggerItem({ children, index = 0, className }: StaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const delayed = index < CAPPED_CHILDREN;

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
      transition={delayed ? undefined : { duration: 0 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
