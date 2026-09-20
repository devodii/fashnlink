'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Warning, CheckCircle, Info, X } from '@phosphor-icons/react/ssr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type InlineAlertTone = 'neutral' | 'success' | 'warning' | 'destructive';

const TONE_ICON: Record<InlineAlertTone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  success: CheckCircle,
  warning: Warning,
  destructive: Warning,
};

const TONE_CLASS: Record<InlineAlertTone, string> = {
  neutral: '',
  success: 'border-success/40 text-success [&>svg]:text-success',
  warning: 'border-warning/40 text-warning [&>svg]:text-warning',
  destructive: 'border-destructive/40 text-destructive [&>svg]:text-destructive',
};

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}

export function InlineAlert({
  tone = 'neutral',
  title,
  children,
  dismissible = true,
  className,
}: InlineAlertProps) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  const Icon = TONE_ICON[tone];
  return (
    <Alert className={cn(TONE_CLASS[tone], dismissible && 'pr-9', className)}>
      <Icon className="size-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </Alert>
  );
}
