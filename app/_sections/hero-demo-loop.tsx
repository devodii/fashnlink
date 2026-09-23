'use client';

import * as React from 'react';
import { useReducedMotion } from 'framer-motion';
import { PaperPlaneTiltIcon, ShoppingBagIcon } from '@phosphor-icons/react/ssr';
import { PhoneFrame } from '@/components/phone-frame';
import { MediaTile } from '@/components/media-tile';
import { Timeline } from '@/components/timeline';
import { Presence } from '@/components/motion/presence';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { DEMO_PRODUCT, DEMO_RENDER_URL } from '@/lib/demo-assets';

type Phase = 'product' | 'checking' | 'revealed';

const CHECKING_STEPS = ['Checking photo', 'Building your model', 'Dressing you'];
const CHECKING_MS = 1800;
const HOLD_MS = 2500;

export function HeroDemoLoop() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>(reduceMotion ? 'revealed' : 'product');
  const [stepIndex, setStepIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (reduceMotion || paused) return;

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setPhase('product');
      timeouts.push(
        setTimeout(() => {
          if (cancelled) return;
          setPhase('checking');
          setStepIndex(0);
          timeouts.push(
            setTimeout(() => !cancelled && setStepIndex(1), CHECKING_MS / 3),
            setTimeout(() => !cancelled && setStepIndex(2), (CHECKING_MS / 3) * 2),
          );
          timeouts.push(
            setTimeout(() => {
              if (cancelled) return;
              setPhase('revealed');
              timeouts.push(
                setTimeout(() => {
                  if (!cancelled) run();
                }, HOLD_MS),
              );
            }, CHECKING_MS),
          );
        }, 1200),
      );
    }

    run();
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [reduceMotion, paused]);

  return (
    <PhoneFrame
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex h-full flex-col bg-card p-3">
        <Presence mode="wait">
          {phase === 'product' && (
            <div key="product" className="flex flex-1 flex-col gap-3">
              <MediaTile
                src={DEMO_PRODUCT.imageUrl}
                alt={DEMO_PRODUCT.title}
                aspect="3/4"
                imageLoading="eager"
              />
              <Button size="sm" className="w-full">
                See it on you
              </Button>
            </div>
          )}

          {phase === 'checking' && (
            <div key="checking" className="flex flex-1 flex-col items-center justify-center gap-6">
              <Timeline
                orientation="vertical"
                steps={CHECKING_STEPS.map((label, i) => ({
                  label,
                  state: i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending',
                }))}
              />
            </div>
          )}

          {phase === 'revealed' && (
            <div key="revealed" className="flex flex-1 flex-col gap-3">
              <MediaTile src={DEMO_RENDER_URL} alt="You wearing the item" className="flex-1" />
              <Stagger className="flex gap-2">
                <StaggerItem>
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <PaperPlaneTiltIcon className="size-3.5" />
                    Send to a friend
                  </Button>
                </StaggerItem>
                <StaggerItem>
                  <Button size="sm" className="w-full gap-1.5">
                    <ShoppingBagIcon className="size-3.5" />
                    Buy
                  </Button>
                </StaggerItem>
              </Stagger>
            </div>
          )}
        </Presence>
      </div>
    </PhoneFrame>
  );
}
