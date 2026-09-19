'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/section';

export interface RetargetOptinsProps {
  merchants: { merchantId: string; merchantName: string }[];
}

export function RetargetOptins({ merchants }: RetargetOptinsProps) {
  const [list, setList] = React.useState(merchants);
  const [pending, setPending] = React.useState<string | null>(null);

  async function optOut(merchantId: string) {
    setPending(merchantId);
    const res = await fetch('/api/me/retarget-optout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ merchantId }),
    }).catch(() => null);
    setPending(null);
    if (res?.ok) setList((prev) => prev.filter((m) => m.merchantId !== merchantId));
  }

  if (list.length === 0) return null;

  return (
    <Section
      title="Shops that can email you looks"
      description="These shops have your permission to send you emails showing you wearing their products."
    >
      <ul className="space-y-2">
        {list.map((m) => (
          <li
            key={m.merchantId}
            className="flex items-center justify-between rounded-md border border-border bg-card p-3"
          >
            <span className="text-sm text-foreground">{m.merchantName}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={pending === m.merchantId}
              onClick={() => optOut(m.merchantId)}
            >
              Opt out
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
