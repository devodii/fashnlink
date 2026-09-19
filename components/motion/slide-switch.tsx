'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface SlideSwitchProps {
  activeKey: string;
  direction?: 1 | -1;
  children: React.ReactNode;
  className?: string;
}

/** Section 10.6: horizontal slide between keyed children — `StepWizard`
 * steps, segmented panels. `direction` picks which way the incoming child
 * enters from (1 = forward/right, -1 = back/left). */
export function SlideSwitch({ activeKey, direction = 1, children, className }: SlideSwitchProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <div className={className} style={{ overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.div
          key={activeKey}
          custom={direction}
          initial={{ x: 24 * direction, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -24 * direction, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
