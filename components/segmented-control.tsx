'use client';

import * as React from 'react';
import { cn } from 'cn';
import { motion, useReducedMotion } from 'framer-motion';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Section 10.4: animated indicator via `LayoutGroup`/`layoutId` (section
 * 10.6), collapses to an instant swap under reduced motion. */
export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  const reduceMotion = useReducedMotion();
  const layoutId = React.useId();

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-md bg-muted p-1', className)} role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-indicator-${layoutId}`}
                className="absolute inset-0 rounded-sm bg-background shadow-sm"
                transition={reduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.2 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
