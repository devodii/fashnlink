'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface WordRotateProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export function WordRotate({ words, intervalMs = 2400, className }: WordRotateProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (reduceMotion || words.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs, reduceMotion]);

  const word = words[index];

  if (reduceMotion) {
    return <span className={className}>{word}</span>;
  }

  return (
    <span className={className} style={{ display: 'inline-grid' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={word}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ gridArea: '1 / 1' }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
