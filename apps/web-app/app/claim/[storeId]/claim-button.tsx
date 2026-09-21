'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/inline-alert';

export function ClaimButton({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [errorKey, setErrorKey] = React.useState(0);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/claims/${storeId}/claim`, { method: 'POST' });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/claim/${storeId}`)}`;
        return null;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong.');
      return json;
    },
    onSuccess: (json) => {
      if (json) router.push('/dashboard');
    },
    onError: () => setErrorKey((k) => k + 1),
  });

  function handleClaim() {
    claimMutation.mutate();
  }

  const error = claimMutation.isError ? (claimMutation.error as Error).message : null;

  return (
    <div className="space-y-3">
      <Button onClick={handleClaim} disabled={claimMutation.isPending}>
        Claim your store
      </Button>
      {error && (
        <InlineAlert tone="destructive" resetKey={errorKey}>
          {error}
        </InlineAlert>
      )}
    </div>
  );
}
