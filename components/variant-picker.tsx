import * as React from 'react';
import { cn } from 'cn';

export interface VariantValue {
  id: string;
  label: string;
  available: boolean;
}

export interface VariantOption {
  name: string;
  values: VariantValue[];
}

export interface VariantPickerProps {
  options: VariantOption[];
  value: Record<string, string>;
  onChange: (optionName: string, valueId: string) => void;
  className?: string;
}

// `value` is keyed by option name, e.g. { Size: "m", Color: "black" }.
export function VariantPicker({ options, value, onChange, className }: VariantPickerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {options.map((option) => (
        <div key={option.name} className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">{option.name}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((v) => {
              const active = value[option.name] === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.available}
                  onClick={() => onChange(option.name, v.id)}
                  className={cn(
                    'min-h-9 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    active
                      ? 'border-ring bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground',
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
