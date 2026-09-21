'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/section';

export interface RetargetOptinsProps {
  merchants: { merchantId: string; merchantName: string }[];
}

export function RetargetOptins({ merchants }: RetargetOptinsProps) {
  const [list, setList] = React.useState(merchants);

  const optOutMutation = useMutation({
    mutationFn: (merchantId: string) =>
      fetch('/api/me/retarget-optout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      }),
    onSuccess: (res, merchantId) => {
      if (res.ok) setList((prev) => prev.filter((m) => m.merchantId !== merchantId));
    },
  });

  function optOut(merchantId: string) {
    optOutMutation.mutate(merchantId);
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
              disabled={optOutMutation.isPending && optOutMutation.variables === m.merchantId}
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
