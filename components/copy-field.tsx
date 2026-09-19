'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Check, Copy } from 'lucide-react';
import { useCopy } from '@/hooks/use-copy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CopyFieldProps {
  value: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

/** read-only value with a copy button and "Copied" state.
 * `translate="no"`; the value is a URL/slug/price, never
 * something Google's widget should touch. */
export function CopyField({ value, label, truncate, className }: CopyFieldProps) {
  const { copied, copy } = useCopy();
  const id = React.useId();

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          translate="no"
          className={cn('notranslate font-mono text-sm', truncate && 'truncate')}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => copy(value)}
          aria-label="Copy"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
