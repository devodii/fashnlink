'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ListFilter } from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/responsive-dialog';

export type FilterOption = { value: string; label: string };

export type FilterDef =
  | { type: 'select'; key: string; label: string; options: FilterOption[] }
  | { type: 'multi'; key: string; label: string; options: FilterOption[] }
  | { type: 'dateRange'; key: string; label: string }
  | { type: 'toggle'; key: string; label: string };

export type FilterValue = Record<
  string,
  string | string[] | { from?: string; to?: string } | boolean | undefined
>;

export interface FilterBarProps {
  filters: FilterDef[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  className?: string;
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}) {
  const set = (v: unknown) => onChange({ ...value, [filter.key]: v as FilterValue[string] });

  if (filter.type === 'select') {
    const current = (value[filter.key] as string) ?? '';
    return (
      <div className="space-y-1.5">
        <Label>{filter.label}</Label>
        <Select value={current} onValueChange={set}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (filter.type === 'multi') {
    const current = Array.isArray(value[filter.key]) ? (value[filter.key] as string[]) : [];
    return (
      <div className="space-y-1.5">
        <Label>{filter.label}</Label>
        <div className="flex flex-wrap gap-1.5">
          {filter.options.map((o) => {
            const active = current.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  set(active ? current.filter((v) => v !== o.value) : [...current, o.value])
                }
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium',
                  active
                    ? 'border-ring bg-secondary text-secondary-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (filter.type === 'dateRange') {
    const current = (value[filter.key] as { from?: string; to?: string }) ?? {};
    return (
      <div className="space-y-1.5">
        <Label>{filter.label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={current.from ?? ''}
            onChange={(e) => set({ ...current, from: e.target.value })}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={current.to ?? ''}
            onChange={(e) => set({ ...current, to: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{filter.label}</Label>
      <Switch checked={!!value[filter.key]} onCheckedChange={set} />
    </div>
  );
}

/** Section 10.4: inline row on desktop, a `ResponsiveDialog` on mobile. */
export function FilterBar({ filters, value, onChange, className }: FilterBarProps) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = React.useState(false);
  const activeCount = Object.values(value).filter(
    (v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  ).length;

  if (isDesktop) {
    return (
      <div className={cn('flex flex-wrap items-end gap-3', className)}>
        {filters.map((filter) => (
          <div key={filter.key} className="w-40">
            <FilterControl filter={filter} value={value} onChange={onChange} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={className}>
        <ListFilter className="size-3.5" />
        Filters{activeCount > 0 && ` (${activeCount})`}
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Filters">
        <div className="space-y-4">
          {filters.map((filter) => (
            <FilterControl key={filter.key} filter={filter} value={value} onChange={onChange} />
          ))}
        </div>
      </ResponsiveDialog>
    </>
  );
}
