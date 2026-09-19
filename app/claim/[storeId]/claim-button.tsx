'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/inline-alert';

export function ClaimButton({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleClaim() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/claims/${storeId}/claim`, { method: 'POST' });
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/claim/${storeId}`)}`;
      return;
    }
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Something went wrong.');
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleClaim} disabled={loading}>
        Claim your store
      </Button>
      {error && <InlineAlert tone="destructive">{error}</InlineAlert>}
    </div>
  );
}
