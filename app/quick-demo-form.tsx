'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';

export function QuickDemoForm() {
  const router = useRouter();
  const [url, setUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setErrorState] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);
  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg) setErrorKey((k) => k + 1);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/public/quick-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error?.message ?? "We couldn't read that product page.");
      setLoading(false);
      return;
    }

    router.push(`/t/${json.slug}`);
  }

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
        <LoadingButton type="submit" loading={loading}>
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
