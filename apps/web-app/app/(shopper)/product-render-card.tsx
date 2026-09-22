'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { cn } from 'cn';
import { ImageReveal } from '@/components/image-reveal';
import { InlineAlert } from '@/components/inline-alert';
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
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);

  function failWith(message: string) {
    setErrorMessage(message);
    setErrorKey((k) => k + 1);
    setStage('error');
  }

  const renderMutation = useMutation({
    mutationFn: async (twinId: string) => {
      const res = await fetch('/api/renders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ linkId, productId, twinId, variantId: null, via }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong');
      return json as { renderId: string };
    },
    onMutate: () => setStage('pending'),
    onSuccess: (json) => setRenderId(json.renderId),
    onError: (err) => failWith(err instanceof Error ? err.message : 'Something went wrong'),
  });

  function handleClick() {
    if (!twinId) return;
    renderMutation.mutate(twinId);
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
        const message =
          json.error && typeof json.error === 'object' && 'message' in json.error
            ? String(json.error.message)
            : 'Something went wrong';
        failWith(message);
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
        <>
          <Button size="sm" variant="outline" className="w-full" onClick={handleClick}>
            Try again
          </Button>
          {errorMessage && (
            <InlineAlert tone="destructive" resetKey={errorKey}>
              {errorMessage}
            </InlineAlert>
          )}
        </>
      )}
    </div>
  );
}
