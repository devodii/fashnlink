'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { PackageIcon } from '@phosphor-icons/react/ssr';
import { MAX_DROP_PRODUCTS } from '@/constants';

type Estimate = { audienceCount: number; itemCount: number; estimatedCredits: number };

async function fetchEstimate(productIds: string[]): Promise<Estimate> {
  const res = await fetch('/api/campaigns?estimate=true', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productIds }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'could not estimate this drop');
  return json;
}

async function createDrop(productIds: string[]): Promise<{ campaignId: string }> {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productIds }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'could not start this drop');
  return json;
}

export function DropForm({ products }: { products: { id: string; title: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [errorKey, setErrorKey] = React.useState(0);

  const estimateQuery = useQuery({
    queryKey: ['drop-estimate', selected],
    queryFn: () => fetchEstimate(selected),
    enabled: selected.length > 0,
  });
  const estimate = selected.length > 0 ? (estimateQuery.data ?? null) : null;

  const confirmMutation = useMutation({
    mutationFn: () => createDrop(selected),
    onSuccess: (data) => {
      router.push(`/dashboard/drops/${data.campaignId}`);
    },
  });

  const error = confirmMutation.isError
    ? (confirmMutation.error as Error).message
    : estimateQuery.isError
      ? (estimateQuery.error as Error).message
      : null;

  React.useEffect(() => {
    if (error) setErrorKey((k) => k + 1);
  }, [error]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= MAX_DROP_PRODUCTS
          ? prev
          : [...prev, id],
    );
  }

  function confirm() {
    confirmMutation.mutate();
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

      {error && (
        <InlineAlert tone="destructive" resetKey={errorKey}>
          {error}
        </InlineAlert>
      )}

      <LoadingButton
        onClick={confirm}
        loading={confirmMutation.isPending}
        disabled={selected.length === 0 || !estimate || estimate.itemCount === 0}
      >
        Confirm and start drop
      </LoadingButton>
    </div>
  );
}
