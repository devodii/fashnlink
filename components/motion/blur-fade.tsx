'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface BlurFadeProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

export function BlurFade({
  children,
  delay = 0,
  duration = 0.5,
  once = true,
  className,
}: BlurFadeProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(6px)', y: 12 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={{ once, margin: '-10%' }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
