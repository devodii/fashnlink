'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/container';
import { PhoneFrame } from '@/components/phone-frame';
import { ShimmerCard } from '@/components/shimmer-card';
import { ProgressSteps, type ProgressStep } from '@/components/progress-steps';
import { InlineAlert } from '@/components/inline-alert';
import { Button } from '@/components/ui/button';

const STAGE_LABELS = ['Reading the product page', 'Checking it fits', 'Preparing your link'];
const STAGE_DELAYS_MS = [0, 2200, 5200];

function useStagedProgress(active: boolean) {
  const [stage, setStage] = React.useState(0);

  React.useEffect(() => {
    if (!active) return;
    const timers = STAGE_DELAYS_MS.slice(1).map((delay, i) =>
      setTimeout(() => setStage(i + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return stage;
}

export function DemoProcessing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get('url') ?? '';
  const [error, setError] = React.useState<string | null>(null);
  const stage = useStagedProgress(!error);

  React.useEffect(() => {
    if (!url) {
      setError('Missing product link. Head back and try again.');
      return;
    }

    let cancelled = false;

    async function run() {
      const res = await fetch('/api/public/quick-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setError(
          json.error?.code === 'RATE_LIMITED'
            ? "You've hit today's demo limit — try again tomorrow, or sign up for your own link."
            : (json.error?.message ?? 'Something went wrong. Please try another product link.'),
        );
        return;
      }

      router.replace(`/t/${json.slug}`);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url, router]);

  const steps: ProgressStep[] = STAGE_LABELS.map((label, i) => ({
    label,
    state: error ? 'pending' : i < stage ? 'done' : i === stage ? 'active' : 'pending',
  }));

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background">
      <Container size="sm" className="flex flex-col items-center gap-8 py-16 text-center">
        <PhoneFrame className="max-w-56">
          <ShimmerCard aspect="9/16" className="size-full rounded-none" />
        </PhoneFrame>

        {error ? (
          <div className="flex w-full max-w-xs flex-col gap-3">
            <InlineAlert tone="destructive">{error}</InlineAlert>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Try another link
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Building your try-on link…</p>
            <ProgressSteps steps={steps} orientation="vertical" />
          </div>
        )}
      </Container>
    </main>
  );
}
