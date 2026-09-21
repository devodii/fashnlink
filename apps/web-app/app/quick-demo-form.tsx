'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';

async function createQuickLink(url: string): Promise<{ slug: string }> {
  const res = await fetch('/api/public/quick-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "We couldn't read that product page.");
  return json;
}

export function QuickDemoForm() {
  const router = useRouter();
  const [url, setUrl] = React.useState('');
  const [errorKey, setErrorKey] = React.useState(0);

  const quickLinkMutation = useMutation({
    mutationFn: createQuickLink,
    onSuccess: (data) => router.push(`/t/${data.slug}`),
    onError: () => setErrorKey((k) => k + 1),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    quickLinkMutation.mutate(url);
  }

  const error = quickLinkMutation.isError ? (quickLinkMutation.error as Error).message : null;

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          required
          placeholder="https://yourshop.com/products/linen-shirt"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <LoadingButton type="submit" loading={quickLinkMutation.isPending}>
          See it on you
        </LoadingButton>
      </form>
      {error && (
        <InlineAlert tone="destructive" resetKey={errorKey}>
          {error}
        </InlineAlert>
      )}
    </div>
  );
}
