import * as React from 'react';
import { cn } from 'cn';
import type * as RHF from 'react-hook-form';
import { Label } from '@/components/ui/label';

export interface FieldLayoutProps {
  htmlFor: string;
  label: string | null;
  description?: string;
  error?: RHF.FieldError;
  className?: string;
  children: React.ReactNode;
}

/** Internal layout every `components/forms/*` field shares: label, control,
 * description, and error rendered in one consistent order (section 10.5). Not
 * itself one of the spec's named field components — it's the shared shell
 * they're all built on, to avoid duplicating this layout in every field. */
export function FieldLayout({ htmlFor, label, description, error, className, children }: FieldLayoutProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
