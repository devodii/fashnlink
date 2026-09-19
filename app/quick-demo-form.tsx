'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';
import { MediaTile } from '@/components/media-tile';

/**
 * the live "paste a product URL" homepage demo, no account
 * required. Posts to `POST /api/public/quick-link` (rate-limited 3/IP/day,
 * section 13) and, once it has a slug, links straight to the real
 * `/t/[slug]` try-on flow so a visitor can actually try it on.
 */
export function QuickDemoForm() {
  const [url, setUrl] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    slug: string;
    productTitle: string;
    imageUrl: string | null;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('working');
    setError(null);
    const res = await fetch('/api/public/quick-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus('error');
      setError(
        json.error?.code === 'RATE_LIMITED'
          ? "You've hit today's demo limit — try again tomorrow, or sign up for your own link."
          : (json.error?.message ?? 'Something went wrong. Please try another product link.'),
      );
      return;
    }
    setResult(json);
    setStatus('done');
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          required
          placeholder="https://yourshop.com/products/linen-shirt"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <LoadingButton type="submit" loading={status === 'working'}>
          See it on you
        </LoadingButton>
      </form>
      {error && <InlineAlert tone="destructive">{error}</InlineAlert>}
      {result && (
        <a href={`/t/${result.slug}`} className="block">
          <MediaTile
            src={result.imageUrl ?? ''}
            alt={result.productTitle}
            aspect="3/4"
            className="mx-auto max-w-40"
          />
          <p className="mt-2 text-sm text-foreground underline underline-offset-2">
            {result.productTitle} — try it on
          </p>
        </a>
      )}
    </div>
  );
}
