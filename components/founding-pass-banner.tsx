'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { cn } from 'cn';
import { InfoIcon } from '@phosphor-icons/react/ssr';

export interface FoundingPassBannerProps {
  label: string;
  note?: string;
}

export function FoundingPassBanner({ label, note }: FoundingPassBannerProps) {
  const [visible, setVisible] = React.useState(false);

  // Reveal-on-mount animation trigger, unrelated to the checkout fetch below.
  React.useEffect(() => setVisible(true), []);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/merchants/me/checkout', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'could not start checkout');
      return json as { paymentUrl: string };
    },
    onSuccess: (json) => {
      window.location.href = json.paymentUrl;
    },
  });

  function handleClick() {
    checkoutMutation.mutate();
  }

  return (
    <div
      className={cn(
        'flex -translate-y-full items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground opacity-0 transition-[transform,opacity] duration-500 ease-out',
        visible && 'translate-y-0 opacity-100',
      )}
    >
      <InfoIcon className="size-4 shrink-0" />
      <button
        type="button"
        onClick={handleClick}
        disabled={checkoutMutation.isPending}
        className="hover:underline"
      >
        {label}
      </button>
      {note && <span className="text-warning-foreground/70">· {note}</span>}
    </div>
  );
}
