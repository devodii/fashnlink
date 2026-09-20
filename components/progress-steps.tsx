import * as React from 'react';
import { cn } from 'cn';
import { Check, X } from '@phosphor-icons/react/ssr';
import { Spinner } from '@/components/spinner';

export type ProgressStepState = 'pending' | 'active' | 'done' | 'error';

export interface ProgressStep {
  label: string;
  state: ProgressStepState;
}

export interface ProgressStepsProps {
  steps: ProgressStep[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const ICON: Record<ProgressStepState, React.ReactNode> = {
  pending: <span className="size-1.5 rounded-full bg-muted-foreground" />,
  active: <Spinner size={14} />,
  done: <Check className="size-3.5" />,
  error: <X className="size-3.5" />,
};

const CIRCLE_CLASS: Record<ProgressStepState, string> = {
  pending: 'border-border text-muted-foreground',
  active: 'border-ring text-foreground',
  done: 'border-success bg-success/15 text-success',
  error: 'border-destructive bg-destructive/15 text-destructive',
};

export function ProgressSteps({
  steps,
  orientation = 'horizontal',
  className,
}: ProgressStepsProps) {
  const vertical = orientation === 'vertical';

  return (
    <div className={cn('flex', vertical ? 'flex-col gap-3' : 'items-start gap-2', className)}>
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div
            className={cn(
              'flex items-center gap-2',
              vertical ? 'flex-row' : 'flex-col text-center',
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border',
                CIRCLE_CLASS[step.state],
              )}
            >
              {ICON[step.state]}
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                step.state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className={cn('bg-border', vertical ? 'ml-3 h-4 w-px' : 'mt-3 h-px flex-1')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
