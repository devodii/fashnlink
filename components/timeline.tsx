'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, XIcon } from '@phosphor-icons/react/ssr';
import { motion, useReducedMotion, useMotionValue, animate } from 'framer-motion';
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
  const [paused, setPaused] = React.useState(false);
  const pathLength = useMotionValue(0);
  const controlsRef = React.useRef<ReturnType<typeof animate> | null>(null);

  // The step only ever advances when the line finishes drawing to the next
  // dot, so the two can never drift out of sync — one animation is the
  // single source of truth for both. Pausing pauses this same animation
  // (framer preserves elapsed time), which is why the advance pauses too.
  React.useEffect(() => {
    if (reduceMotion) {
      pathLength.set(1);
      return;
    }
    if (activeStep === 0) pathLength.jump(0);
    const controls = animate(pathLength, (activeStep + 1) / steps.length, {
      duration: DWELL_MS / 1000,
      ease: 'linear',
      onComplete: () => {
        const next = (activeStep + 1) % steps.length;
        onStepChange?.(next);
        setActiveStep(next);
      },
    });
    controlsRef.current = controls;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, reduceMotion]);

  React.useEffect(() => {
    if (paused) controlsRef.current?.pause();
    else controlsRef.current?.play();
  }, [paused]);

  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  return (
    <div className={cn('grid min-w-0 gap-10 lg:grid-cols-2', className)} {...pauseHandlers}>
      <div className="relative flex min-w-0 flex-col gap-10 pl-10">
        <svg
          aria-hidden
          className="absolute top-0 left-3 h-full w-0.5"
          viewBox="0 0 2 100"
          preserveAspectRatio="none"
        >
          <path
            d="M1 0 L1 100"
            className="stroke-border"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <motion.path
            d="M1 0 L1 100"
            className="stroke-foreground"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{ pathLength }}
          />
        </svg>

        {steps.map((step, i) => {
          const reached = i <= activeStep;
          return (
            <div key={step.label} className="relative">
              <motion.span
                aria-hidden
                className={cn(
                  'absolute top-1 -left-10 flex size-6 items-center justify-center rounded-full border text-xs font-medium',
                  reached
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground',
                )}
                initial={false}
                animate={{ scale: reached ? 1 : 0.85 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {i + 1}
              </motion.span>
              <motion.div
                initial={false}
                animate={{ opacity: reached ? 1 : 0.4 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-2"
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
