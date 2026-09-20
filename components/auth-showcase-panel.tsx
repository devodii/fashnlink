'use client';

import * as React from 'react';
import { Link2, Shirt, Sparkles } from 'lucide-react';
import { cn } from 'cn';
import { PhoneFrame } from '@/components/phone-frame';
import { Reveal } from '@/components/motion/reveal';

const CYCLE_MS = 3200;

function LinkScreen() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <Link2 className="size-3.5" />
        yourshop.com/products/...
      </div>
      <p className="text-xs text-muted-foreground">Paste a product link</p>
    </div>
  );
}

function TryonScreen() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
        <Shirt className="size-9 text-secondary-foreground" strokeWidth={1.25} />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" />
        See it on you
      </div>
    </div>
  );
}

export interface AuthShowcasePanelProps {
  className?: string;
}

export function AuthShowcasePanel({ className }: AuthShowcasePanelProps) {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setRevealed((v) => !v), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 rounded-2xl bg-secondary p-10',
        className,
      )}
    >
      <PhoneFrame className="max-w-64 border-0 shadow-sm">
        <Reveal
          revealed={revealed}
          from={<LinkScreen />}
          to={<TryonScreen />}
          className="size-full"
        />
      </PhoneFrame>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Send a link. They see themselves wearing it in seconds.
      </p>
    </div>
  );
}
