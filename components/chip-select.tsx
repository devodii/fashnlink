'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Pressable } from '@/components/motion/pressable';
import { Presence } from '@/components/motion/presence';

export interface ChipSelectOption {
  value: string;
  label: string;
}

export interface ChipSelectProps {
  options: ChipSelectOption[];
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
}

export function ChipSelect({ options, value, onChange, className }: ChipSelectProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} className="inline-flex">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selected
                  ? 'border-ring bg-secondary text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {option.label}
              <Presence>
                {selected && (
                  <motion.span
                    key="check"
                    initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.15 }}
                    className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-2.5" />
                  </motion.span>
                )}
              </Presence>
            </button>
          </Pressable>
        );
      })}
    </div>
  );
}
