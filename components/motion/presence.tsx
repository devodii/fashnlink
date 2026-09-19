'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';

export interface PresenceProps {
  children: React.ReactNode;
  mode?: 'wait' | 'popLayout' | 'sync';
}

/** thin `AnimatePresence` wrapper so call sites import from
 * `components/motion` rather than `framer-motion` directly. */
export function Presence({ children, mode = 'wait' }: PresenceProps) {
  return <AnimatePresence mode={mode}>{children}</AnimatePresence>;
}
