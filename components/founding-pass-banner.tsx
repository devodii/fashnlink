'use client';

import * as React from 'react';
import { cn } from 'cn';
import { InfoIcon } from '@phosphor-icons/react/ssr';

export interface FoundingPassBannerProps {
  label: string;
  note?: string;
}

export function FoundingPassBanner({ label, note }: FoundingPassBannerProps) {
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => setVisible(true), []);

  async function handleClick() {
    setLoading(true);
    const res = await fetch('/api/merchants/me/checkout', { method: 'POST' });
    const json = await res.json();
    setLoading(false);
    if (res.ok) window.location.href = json.paymentUrl;
  }

  return (
    <div
      className={cn(
        'flex -translate-y-full items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground opacity-0 transition-[transform,opacity] duration-500 ease-out',
        visible && 'translate-y-0 opacity-100',
      )}
    >
      <InfoIcon className="size-4 shrink-0" />
      <button type="button" onClick={handleClick} disabled={loading} className="hover:underline">
        {label}
      </button>
      {note && <span className="text-warning-foreground/70">· {note}</span>}
    </div>
  );
}
