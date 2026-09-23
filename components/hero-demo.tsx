'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { cn } from 'cn';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dot } from '@/components/dot';
import { DEMO_CHIPS } from '@/lib/demo-assets';

interface QuickLinkResult {
  slug: string;
}

// The quick-link route already returns human-readable messages for the
// wearable gate (not wearable / unsupported store / try another link); this
// is only the generic network-level fallback, kept equally human.
const FALLBACK_MESSAGE = "We couldn't read that product page. Try another link.";

async function createQuickLink(url: string): Promise<QuickLinkResult> {
  const res = await fetch('/api/public/quick-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? FALLBACK_MESSAGE);
  return json;
}

const TRUST_ITEMS = ['No app install', 'Photos deleted on request', 'Free to start'];

export interface HeroDemoProps {
  className?: string;
  /** Just the input and button, no chips/helper line/trust line — for reuse where that context was already shown once (the final CTA). */
  compact?: boolean;
}

export function HeroDemo({ className, compact }: HeroDemoProps) {
  const router = useRouter();
  const [url, setUrl] = React.useState('');
  const [errorKey, setErrorKey] = React.useState(0);

  const mutation = useMutation({
    mutationFn: createQuickLink,
    onSuccess: (data) => router.push(`/t/${data.slug}`),
    onError: () => setErrorKey((k) => k + 1),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    mutation.mutate(url);
  }

  function handleChip(chipUrl: string) {
    setUrl(chipUrl);
    mutation.mutate(chipUrl);
  }

  const message = mutation.isError ? (mutation.error as Error).message : null;

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          required
          placeholder="Paste any product link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 flex-1"
        />
        <LoadingButton type="submit" loading={mutation.isPending} className="h-12 rounded-md px-5">
          Try it
        </LoadingButton>
      </form>

      {!compact && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value=""
          onValueChange={(value) => {
            const chip = DEMO_CHIPS.find((c) => c.value === value);
            if (chip) handleChip(chip.url);
          }}
          className="flex-wrap justify-start gap-2"
        >
          {DEMO_CHIPS.map((chip) => (
            <ToggleGroupItem key={chip.value} value={chip.value} className="rounded-full border">
              {chip.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {!compact && (
        <p className="text-sm text-muted-foreground">
          Works with Shopify, WooCommerce, Squarespace, Wix and most product pages. No install.
        </p>
      )}

      {message && (
        <InlineAlert tone="neutral" resetKey={errorKey}>
          {message}
        </InlineAlert>
      )}

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {TRUST_ITEMS.map((item, i) => (
            <React.Fragment key={item}>
              {i > 0 && <Dot />}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
