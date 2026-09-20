'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TShirtIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';

export interface ShimmerCardProps {
  aspect?: '3/4' | '1/1' | '9/16';
  className?: string;
}

const ASPECT_CLASS = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '9/16': 'aspect-[9/16]',
} as const;

export function ShimmerCard({ aspect = '3/4', className }: ShimmerCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        ASPECT_CLASS[aspect],
        className,
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={reduceMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TShirtIcon className="size-16 text-muted-foreground/40" strokeWidth={1} />
        </motion.div>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2">
        <div className="h-3 w-2/3 rounded-full bg-card/70" />
        <div className="h-3 w-1/3 rounded-full bg-card/70" />
      </div>

      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-card/50"
            style={{ mixBlendMode: 'overlay' }}
            animate={{ x: ['-120%', '120%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-card/25"
            style={{ mixBlendMode: 'overlay' }}
            animate={{ x: ['120%', '-120%'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
        </>
      )}
    </div>
  );
}
