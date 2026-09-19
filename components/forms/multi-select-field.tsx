'use client';

import * as React from 'react';
import * as RHF from 'react-hook-form';
import { cn } from 'cn';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FieldLayout } from './field-layout';
import type { FieldProps } from './types';

export interface MultiSelectFieldOption {
  value: string;
  label: string;
}

export interface MultiSelectFieldProps<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>
  extends FieldProps<TValues, TName> {
  options: MultiSelectFieldOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectField<TValues extends RHF.FieldValues, TName extends RHF.Path<TValues>>({
  control,
  name,
  label,
  description,
  className,
  options,
  placeholder = 'Select…',
  disabled,
}: MultiSelectFieldProps<TValues, TName>) {
  const [open, setOpen] = React.useState(false);

  return (
    <RHF.Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : [];

        function toggle(value: string) {
          field.onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
        }

        return (
          <FieldLayout htmlFor={name} label={label} description={description} error={fieldState.error} className={className}>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={name}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-invalid={!!fieldState.error}
                  disabled={disabled}
                  className="w-full justify-between font-normal"
                >
                  <span className="flex flex-wrap gap-1 truncate text-left">
                    {selected.length === 0
                      ? <span className="text-muted-foreground">{placeholder}</span>
                      : options
                          .filter((o) => selected.includes(o.value))
                          .map((o) => o.label)
                          .join(', ')}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search…" />
                  <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem key={option.value} onSelect={() => toggle(option.value)}>
                          <Check className={cn('size-4', selected.includes(option.value) ? 'opacity-100' : 'opacity-0')} />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {options
                  .filter((o) => selected.includes(o.value))
                  .map((o) => (
                    <span
                      key={o.value}
                      className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {o.label}
                      <button type="button" onClick={() => toggle(o.value)} aria-label={`Remove ${o.label}`}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </FieldLayout>
        );
      }}
    />
  );
}
