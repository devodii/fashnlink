'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { ImageReveal } from '@/components/image-reveal';
import { ShareSheet } from '@/components/share-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Container } from '@/components/container';

export interface OwnRenderResultProps {
  renderId: string;
  slug: string;
  merchantName: string;
  productTitle: string;
  price: string | null;
  outputUrl: string;
  buyUrl: string | null;
  messageHref: string | null;
  showEmailGate: boolean;
}

export function OwnRenderResult({
  renderId,
  slug,
  merchantName,
  productTitle,
  price,
  outputUrl,
  buyUrl,
  messageHref,
  showEmailGate: initialShowEmailGate,
}: OwnRenderResultProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [showEmailGate, setShowEmailGate] = React.useState(initialShowEmailGate);
  const [email, setEmail] = React.useState('');
  const [retargetOptIn, setRetargetOptIn] = React.useState(false);

  const leadMutation = useMutation({
    mutationFn: (vars: { email: string; renderId: string; retargetOptIn: boolean }) =>
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSettled: () => setShowEmailGate(false),
  });

  function handleBuyClick() {
    fetch(`/api/renders/${renderId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'buy_click' }),
    }).catch(() => {});
    if (buyUrl) window.open(buyUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">{productTitle}</h1>
        {price && <p className="text-sm text-muted-foreground">{price}</p>}
      </div>

      <ImageReveal from={outputUrl} to={outputUrl} alt={productTitle} zoomable />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <ShareSheet
          title={`See it on you at ${merchantName}`}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          onShare={() => {
            fetch(`/api/renders/${renderId}`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ event: 'share' }),
            }).catch(() => {});
          }}
        />
        {messageHref && (
          <Button variant="outline" asChild>
            <a href={messageHref} target="_blank" rel="noopener noreferrer">
              Message the shop
            </a>
          </Button>
        )}
        {buyUrl && (
          <motion.div
            animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Button onClick={handleBuyClick} className="shadow-lg shadow-primary/40">
              Buy
            </Button>
          </motion.div>
        )}
        <Button variant="ghost" onClick={() => router.push(`/t/${slug}`)}>
          Try another look
        </Button>
      </div>

      {showEmailGate && (
        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Save your looks</p>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex items-start gap-2">
            <Checkbox
              id="retarget-opt-in"
              checked={retargetOptIn}
              onCheckedChange={(v) => setRetargetOptIn(v === true)}
            />
            <Label htmlFor="retarget-opt-in" className="text-sm leading-snug font-normal">
              Send me looks from {merchantName} using my photo. Unsubscribe anytime.
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => leadMutation.mutate({ email, renderId, retargetOptIn })}
              disabled={!email}
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setShowEmailGate(false)}>
              Not now
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
