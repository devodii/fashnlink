'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ImageReveal } from '@/components/image-reveal';
import { Button } from '@/components/ui/button';
import { usePolling } from '@/hooks/use-polling';

export interface ProductRenderCardProps {
  linkId: string;
  productId: string;
  productTitle: string;
  productImageUrl: string | null;
  twinId: string | null;
  via: 'poll' | 'group';
  onRendered?: (renderId: string, outputUrl: string) => void;
  className?: string;
}

type Stage = 'idle' | 'pending' | 'ready' | 'error';

/**
 * Shared by poll and group `/t/[slug]` modes (M6, section 9.3/9.4): one
 * product, one twin already on hand, a "see it on you" -> render -> poll
 * cycle; the multi-product sibling of `TryOnFlow`'s single render path.
 */
export function ProductRenderCard({
  linkId,
  productId,
  productTitle,
  productImageUrl,
  twinId,
  via,
  onRendered,
  className,
}: ProductRenderCardProps) {
  const [stage, setStage] = React.useState<Stage>('idle');
  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);

  async function handleClick() {
    if (!twinId) return;
    setStage('pending');
    const res = await fetch('/api/renders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ linkId, productId, twinId, variantId: null, via }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStage('error');
      return;
    }
    setRenderId(json.renderId);
  }

  usePolling(
    async () => {
      if (!renderId) return false;
      const res = await fetch(`/api/renders/${renderId}/status`);
      if (!res.ok) return false;
      const json = await res.json();
      if (json.status === 'succeeded' && json.outputUrl) {
        setOutputUrl(json.outputUrl);
        setStage('ready');
        onRendered?.(renderId, json.outputUrl);
        return false;
      }
      if (json.status === 'failed' || json.status === 'blocked') {
        setStage('error');
        return false;
      }
    },
    2000,
    stage === 'pending' && !!renderId,
  );

  return (
    <div className={cn('space-y-2', className)}>
      <ImageReveal
        from={productImageUrl ?? ''}
        to={stage === 'ready' ? outputUrl : null}
        alt={productTitle}
      />
      <p className="truncate text-sm text-foreground">{productTitle}</p>
      {stage === 'idle' && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={!twinId}
          onClick={handleClick}
        >
          See it on you
        </Button>
      )}
      {stage === 'pending' && (
        <Button size="sm" variant="outline" className="w-full" disabled>
          Rendering…
        </Button>
      )}
      {stage === 'error' && (
        <Button size="sm" variant="outline" className="w-full" onClick={handleClick}>
          Try again
        </Button>
      )}
    </div>
  );
}
