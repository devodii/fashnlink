'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/** Section 10.4: numeric +/- input — quantity-style pickers. */
export function Stepper({ value, onChange, min = 0, max = Infinity, step = 1, className }: StepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
