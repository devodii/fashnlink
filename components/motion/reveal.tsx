'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface RevealProps {
  /** Whether `to` is ready to crossfade in. While `false`, `from` shows with
   * a shimmer band passing over it. */
  revealed: boolean;
  from: React.ReactNode;
  to: React.ReactNode;
  /** Give the container an explicit size (e.g. `aspect-[3/4]`, section 10.2)
   *; both layers are absolutely positioned to crossfade, so this component
   * has no intrinsic size of its own. */
  className?: string;
}

/** the render reveal; product image scales 1 -> 1.02 and dims
 * while a shimmer (a moving `bg-muted` band, not a gradient) passes; on
 * completion, crossfades to the render over 600ms with a 1.02 -> 1 settle.
 * The only animated loading texture in the app. */
export function Reveal({ revealed, from, to, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{revealed ? to : from}</div>;
  }

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        {!revealed && (
          <motion.div
            key="from"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0.85, scale: 1.02 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {from}
            <motion.div
              aria-hidden
              className="bg-muted/60"
              style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
        {revealed && (
          <motion.div
            key="to"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {to}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
