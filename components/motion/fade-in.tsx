'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  once?: boolean;
  className?: string;
}

/** opacity + 8px y, under 400ms. Route content and page-load
 * entrances use this. Collapses to instant under reduced motion. */
export function FadeIn({ children, delay = 0, once = true, className }: FadeInProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={once ? { opacity: 1, y: 0 } : undefined}
      animate={once ? undefined : { opacity: 1, y: 0 }}
      viewport={once ? { once: true } : undefined}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
