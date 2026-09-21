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

export function FieldLayout({
  htmlFor,
  label,
  description,
  error,
  className,
  children,
}: FieldLayoutProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
