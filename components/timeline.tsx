'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, XIcon } from '@phosphor-icons/react/ssr';
import { motion, useReducedMotion } from 'framer-motion';
import { Spinner } from '@/components/spinner';
import { Presence } from '@/components/motion/presence';

export type TimelineStepState = 'pending' | 'active' | 'done' | 'error';

export interface TimelineStep {
  label: string;
  state?: TimelineStepState;
  /** Used only when `animated`: the narrative heading, shown instead of `label`. */
  title?: string;
  description?: string;
  media?: React.ReactNode;
}

export interface TimelineProps {
  steps: TimelineStep[];
  orientation?: 'horizontal' | 'vertical';
  /** Scroll-driven "how it works" layout instead of the pipeline-status stepper. */
  animated?: boolean;
  onStepChange?: (index: number) => void;
  className?: string;
}

const ICON: Record<TimelineStepState, React.ReactNode> = {
  pending: <span className="size-1.5 rounded-full bg-muted-foreground" />,
  active: <Spinner size={14} />,
  done: <CheckIcon className="size-3.5" />,
  error: <XIcon className="size-3.5" />,
};

const CIRCLE_CLASS: Record<TimelineStepState, string> = {
  pending: 'border-border text-muted-foreground',
  active: 'border-ring text-foreground',
  done: 'border-success bg-success/15 text-success',
  error: 'border-destructive bg-destructive/15 text-destructive',
};

export function Timeline({
  steps,
  orientation = 'horizontal',
  animated = false,
  onStepChange,
  className,
}: TimelineProps) {
  if (animated) {
    return <AnimatedTimeline steps={steps} onStepChange={onStepChange} className={className} />;
  }

  const vertical = orientation === 'vertical';

  return (
    <div className={cn('flex', vertical ? 'flex-col gap-3' : 'items-start gap-2', className)}>
      {steps.map((step, i) => {
        const state = step.state ?? 'pending';
        return (
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
                  CIRCLE_CLASS[state],
                )}
              >
                {ICON[state]}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={cn('bg-border', vertical ? 'ml-3 h-4 w-px' : 'mt-3 h-px flex-1')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const DWELL_MS = 4000;

function AnimatedTimeline({
  steps,
  onStepChange,
  className,
}: {
  steps: TimelineStep[];
  onStepChange?: (index: number) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [activeStep, setActiveStep] = React.useState(0);
  const [cycle, setCycle] = React.useState(0);

  // Runs continuously and is never paused, per design — this is a passive
  // narrative, not something the visitor is meant to interact with.
  React.useEffect(() => {
    if (reduceMotion) return;
    const id = setTimeout(() => {
      const next = (activeStep + 1) % steps.length;
      if (next === 0) setCycle((c) => c + 1);
      onStepChange?.(next);
      setActiveStep(next);
    }, DWELL_MS);
    return () => clearTimeout(id);
  }, [activeStep, reduceMotion, steps.length, onStepChange]);

  return (
    <div className={cn('grid min-w-0 gap-10 lg:grid-cols-2', className)}>
      {/* Remounting on every loop (via `cycle`) resets every dot/segment/text
          motion value back to its initial state, so each replay is a clean
          one rather than everything staying "done" after the first pass. */}
      <div key={cycle} className="flex min-w-0 flex-col">
        {steps.map((step, i) => {
          const reached = i <= activeStep || reduceMotion;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.label} className="flex min-w-0 gap-4">
              <div className="flex shrink-0 flex-col items-center">
                <motion.span
                  aria-hidden
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    reached
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground',
                  )}
                  initial={reduceMotion ? undefined : { scale: 0.85 }}
                  animate={{ scale: reached ? 1 : 0.85 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {i + 1}
                </motion.span>
                {!isLast && (
                  <div className="my-1 w-0.5 flex-1 overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="w-full origin-top bg-foreground"
                      initial={reduceMotion ? undefined : { scaleY: 0 }}
                      animate={{
                        scaleY: i < activeStep || reduceMotion ? 1 : i === activeStep ? 1 : 0,
                      }}
                      transition={{
                        duration: i === activeStep && !reduceMotion ? DWELL_MS / 1000 : 0,
                        ease: 'linear',
                      }}
                      style={{ height: '100%' }}
                    />
                  </div>
                )}
              </div>
              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0.4 }}
                animate={{ opacity: reached ? 1 : 0.4 }}
                transition={{ duration: 0.4 }}
                className={cn('flex min-w-0 flex-1 flex-col gap-2', !isLast && 'pb-10')}
              >
                <h3 className="text-xl font-medium text-foreground">{step.title ?? step.label}</h3>
                {step.description && (
                  <p className="max-w-md text-muted-foreground">{step.description}</p>
                )}
                {step.media && <div className="pt-2 lg:hidden">{step.media}</div>}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="hidden min-w-0 lg:sticky lg:top-24 lg:grid lg:h-fit">
        <Presence mode="sync">
          <motion.div
            key={activeStep}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="min-w-0 [grid-area:1/1]"
          >
            {steps[activeStep]?.media}
          </motion.div>
        </Presence>
      </div>
    </div>
  );
}
