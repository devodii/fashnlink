'use client';

import * as React from 'react';
import { type HTMLMotionProps, motion, useReducedMotion } from 'framer-motion';

export interface PressableProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

/** `whileTap: scale 0.98` for cards and primary buttons on
 * touch. */
export function Pressable({ children, className, ...props }: PressableProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
