'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Check } from 'lucide-react';

export interface SwatchOption {
  id: string;
  token: string; // e.g. "brand-1" -> resolves to var(--brand-1) via data attribute, never inline hex
}

export interface SwatchPickerProps {
  options: SwatchOption[];
  value?: string;
  onChange: (id: string) => void;
  className?: string;
}

/** fixed named accent tokens only (`--brand-1`..`--brand-6`,
 * section 10.1); never a free color picker. */
export function SwatchPicker({ options, value, onChange, className }: SwatchPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          data-swatch={option.token}
          onClick={() => onChange(option.id)}
          className={cn(
            'flex size-8 items-center justify-center rounded-full border border-border transition-shadow',
            value === option.id && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
          )}
          style={{ backgroundColor: `var(--${option.token})` }}
        >
          {value === option.id && <Check className="size-4 text-primary-foreground" />}
        </button>
      ))}
    </div>
  );
}
