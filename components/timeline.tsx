'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, XIcon } from '@phosphor-icons/react/ssr';
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Spinner } from '@/components/spinner';
import { Presence } from '@/components/motion/presence';
import { BlurFade } from '@/components/motion/blur-fade';

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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = React.useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.75', 'end 0.4'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const index = Math.min(steps.length - 1, Math.max(0, Math.floor(progress * steps.length)));
    setActiveStep((current) => {
      if (current === index) return current;
      onStepChange?.(index);
      return index;
    });
  });

  return (
    <div ref={containerRef} className={cn('grid gap-10 lg:grid-cols-2', className)}>
      <div className="relative flex flex-col gap-16 pl-10">
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
            style={reduceMotion ? undefined : { pathLength: scrollYProgress }}
            initial={false}
            animate={reduceMotion ? { pathLength: 1 } : undefined}
          />
        </svg>

        {steps.map((step, i) => (
          <div key={step.label} className="relative">
            <motion.span
              aria-hidden
              className="absolute top-1 -left-10 flex size-6 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-foreground"
              initial={reduceMotion ? undefined : { scale: 0.6 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
              transition={{ duration: 0.3 }}
            >
              {i + 1}
            </motion.span>
            <BlurFade once className="flex flex-col gap-2">
              <h3 className="text-xl font-medium text-foreground">{step.title ?? step.label}</h3>
              {step.description && (
                <p className="max-w-md text-muted-foreground">{step.description}</p>
              )}
              {step.media && <div className="pt-2 lg:hidden">{step.media}</div>}
            </BlurFade>
          </div>
        ))}
      </div>

      <div className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
        <Presence mode="wait">
          <motion.div
            key={activeStep}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {steps[activeStep]?.media}
          </motion.div>
        </Presence>
      </div>
    </div>
  );
}
