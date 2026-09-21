'use client';

import * as React from 'react';
import { cn } from 'cn';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlideSwitch } from '@/components/motion/slide-switch';
import { Button } from '@/components/ui/button';

export interface StepWizardApi {
  next: () => void;
  back: () => void;
  goTo: (id: string) => void;
  /**
   * Lets the current step intercept the wizard's own "Next" button: the
   * handler runs first and only advances the step if it resolves true, so a
   * step can validate and/or submit before moving on instead of needing its
   * own separate submit button alongside the wizard's Next.
   */
  setOnNext: (handler: (() => Promise<boolean>) | null) => void;
}

export interface StepWizardStep {
  id: string;
  title: string;
  optional?: boolean;
  render: (api: StepWizardApi) => React.ReactNode;
}

export interface StepWizardProps {
  steps: StepWizardStep[];
  initialStepId?: string;
  onStepChange?: (id: string) => void;
  className?: string;
}

export function StepWizard({ steps, initialStepId, onStepChange, className }: StepWizardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stepParam = searchParams.get('step');
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === (stepParam ?? initialStepId ?? steps[0]?.id)),
  );
  const currentStep = steps[currentIndex];
  const prevIndexRef = React.useRef(currentIndex);
  const direction: 1 | -1 = currentIndex >= prevIndexRef.current ? 1 : -1;
  prevIndexRef.current = currentIndex;
  const onNextRef = React.useRef<(() => Promise<boolean>) | null>(null);
  const [advancing, setAdvancing] = React.useState(false);

  function setStep(id: string) {
    onNextRef.current = null;
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    onStepChange?.(id);
  }

  const api: StepWizardApi = React.useMemo(
    () => ({
      next: () => {
        const nextStep = steps[currentIndex + 1];
        if (nextStep) setStep(nextStep.id);
      },
      back: () => {
        const prevStep = steps[currentIndex - 1];
        if (prevStep) setStep(prevStep.id);
      },
      goTo: setStep,
      setOnNext: (handler) => {
        onNextRef.current = handler;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, steps],
  );

  async function handleNext() {
    if (onNextRef.current) {
      setAdvancing(true);
      const shouldAdvance = await onNextRef.current();
      setAdvancing(false);
      if (!shouldAdvance) return;
    }
    api.next();
  }

  if (!currentStep) return null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <span
            key={step.id}
            className={cn('h-1 flex-1 rounded-full', i <= currentIndex ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>

      <SlideSwitch activeKey={currentStep.id} direction={direction}>
        {currentStep.render(api)}
      </SlideSwitch>

      <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-background py-3 md:static md:border-0 md:pt-0">
        <Button type="button" variant="ghost" onClick={api.back} disabled={currentIndex === 0}>
          Back
        </Button>
        {currentIndex < steps.length - 1 && (
          <Button
            type="button"
            variant={currentStep.optional ? 'ghost' : 'default'}
            onClick={currentStep.optional ? api.next : handleNext}
            disabled={advancing}
          >
            {currentStep.optional ? 'Skip' : advancing ? 'Working…' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  );
}
