'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { PackageIcon } from '@phosphor-icons/react/ssr';
import { MAX_DROP_PRODUCTS } from '@/config/limits';

type Estimate = { audienceCount: number; itemCount: number; estimatedCredits: number };

export function DropForm({ products }: { products: { id: string; title: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [estimate, setEstimate] = React.useState<Estimate | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (selected.length === 0) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    fetch('/api/campaigns/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productIds: selected }),
    }).then(async (res) => {
      if (cancelled) return;
      const json = await res.json();
      if (res.ok) setEstimate(json);
      else setError(json.error?.message ?? 'could not estimate this drop');
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= MAX_DROP_PRODUCTS
          ? prev
          : [...prev, id],
    );
  }

  async function confirm() {
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productIds: selected }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'could not start this drop');
      return;
    }
    router.push(`/dashboard/drops/${json.campaignId}`);
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageIcon}
        title="No eligible products yet"
        description="Products need a usable try-on image before they can be part of a drop."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-md border border-border p-3">
            <Checkbox
              id={p.id}
              checked={selected.includes(p.id)}
              onCheckedChange={() => toggle(p.id)}
              disabled={!selected.includes(p.id) && selected.length >= MAX_DROP_PRODUCTS}
            />
            <Label htmlFor={p.id} className="text-sm font-normal text-foreground">
              {p.title}
            </Label>
          </li>
        ))}
      </ul>

      {estimate && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Audience" value={estimate.audienceCount} />
          <StatCard label="Estimated credits" value={estimate.estimatedCredits} />
        </div>
      )}

      {error && <InlineAlert tone="destructive">{error}</InlineAlert>}

      <LoadingButton
        onClick={confirm}
        loading={submitting}
        disabled={selected.length === 0 || !estimate || estimate.itemCount === 0}
      >
        Confirm and start drop
      </LoadingButton>
    </div>
  );
}
