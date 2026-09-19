'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

/** Section 10.4: debounced, clearable. `value`/`onChange` are the committed
 * (debounced) value — the input keeps its own draft internally so keystrokes
 * never feel throttled. */
export function SearchInput({ value, onChange, placeholder = 'Search…', debounceMs = 300, className }: SearchInputProps) {
  const [draft, setDraft] = React.useState(value);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => setDraft(value), [value]);

  React.useEffect(() => {
    if (draft === value) return;
    const id = setTimeout(() => onChangeRef.current(draft), debounceMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, debounceMs]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className="pl-8 pr-8" />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Clear"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
