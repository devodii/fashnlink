import * as React from 'react';
import { cn } from 'cn';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type InlineAlertTone = 'neutral' | 'success' | 'warning' | 'destructive';

const TONE_ICON: Record<InlineAlertTone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertTriangle,
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
  className?: string;
}

/** Section 10.4: the only alert style in the app — root-level form errors
 * (`Form`), scraper/wearable-gate rejection messages, empty/error states. */
export function InlineAlert({ tone = 'neutral', title, children, className }: InlineAlertProps) {
  const Icon = TONE_ICON[tone];
  return (
    <Alert className={cn(TONE_CLASS[tone], className)}>
      <Icon className="size-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
