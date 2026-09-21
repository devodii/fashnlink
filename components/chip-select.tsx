'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon } from '@phosphor-icons/react/ssr';
import { motion, useReducedMotion } from 'framer-motion';
import { Pressable } from '@/components/motion/pressable';
import { Presence } from '@/components/motion/presence';

export interface ChipSelectOption {
  value: string;
  label: string;
}

type ChipSelectSingleProps = {
  multiple?: false;
  value?: string | null;
  onChange: (value: string) => void;
};

type ChipSelectMultipleProps = {
  multiple: true;
  value?: string[];
  onChange: (value: string[]) => void;
};

export type ChipSelectProps = (ChipSelectSingleProps | ChipSelectMultipleProps) & {
  options: ChipSelectOption[];
  className?: string;
};

export function ChipSelect({ options, value, onChange, className, multiple }: ChipSelectProps) {
  const reduceMotion = useReducedMotion();
  const selectedValues = multiple ? (value ?? []) : [];

  function toggle(optionValue: string) {
    if (multiple) {
      onChange(
        selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue],
      );
      return;
    }
    onChange(optionValue);
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role={multiple ? 'group' : 'radiogroup'}>
      {options.map((option) => {
        const selected = multiple ? selectedValues.includes(option.value) : option.value === value;
        return (
          <Pressable key={option.value} className="inline-flex">
            <button
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={selected}
              onClick={() => toggle(option.value)}
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
                    <CheckIcon className="size-2.5" />
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
