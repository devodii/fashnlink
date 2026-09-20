'use client';

import * as React from 'react';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';

export function BuyFoundingPassButton({ label }: { label: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/merchants/me/checkout', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }
    window.location.href = json.paymentUrl;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <LoadingButton loading={loading} onClick={handleClick}>
        {label}
      </LoadingButton>
      {error && <InlineAlert tone="destructive">{error}</InlineAlert>}
    </div>
  );
}
