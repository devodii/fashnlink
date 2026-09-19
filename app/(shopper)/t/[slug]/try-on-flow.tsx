'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineAlert } from '@/components/inline-alert';
import { ImageReveal } from '@/components/image-reveal';
import { VariantPicker, type VariantOption } from '@/components/variant-picker';
import { UploadDropzone, type UploadedFile } from '@/components/upload-dropzone';
import { ProgressSteps, type ProgressStep } from '@/components/progress-steps';
import { ShareSheet } from '@/components/share-sheet';
import { Container } from '@/components/container';
import { usePolling } from '@/hooks/use-polling';
import { formatPriceCents } from '@/lib/format';

type Twin = { id: string; status: string; twinUrl: string | null };
type ContactChannel = { type: 'whatsapp' | 'instagram' | 'email'; value: string } | null;

export interface TryOnFlowProps {
  linkId: string;
  productId: string;
  productTitle: string;
  priceCents: number | null;
  currency: string | null;
  buyUrl: string | null;
  merchantName: string;
  contactChannel: ContactChannel;
  accentToken: string | null;
  productImageUrl: string | null;
  variantOptions: VariantOption[];
  defaultTwin: Twin | null;
  viaRenderId: string | null;
  preview: boolean;
}

type Stage =
  'idle' | 'consent' | 'twin-pending' | 'render-pending' | 'result' | 'blocked' | 'error';

function contactHref(
  channel: ContactChannel,
  productTitle: string,
  pageUrl: string,
): string | null {
  if (!channel) return null;
  const text = encodeURIComponent(`Hi! I'm interested in ${productTitle} — ${pageUrl}`);
  if (channel.type === 'whatsapp') return `https://wa.me/${channel.value}?text=${text}`;
  if (channel.type === 'instagram') return `https://ig.me/m/${channel.value}`;
  return `mailto:${channel.value}?subject=${encodeURIComponent(productTitle)}`;
}

export function TryOnFlow({
  linkId,
  productId,
  productTitle,
  priceCents,
  currency,
  buyUrl,
  merchantName,
  contactChannel,
  accentToken,
  productImageUrl,
  variantOptions,
  defaultTwin,
  viaRenderId,
  preview,
}: TryOnFlowProps) {
  const [stage, setStage] = React.useState<Stage>('idle');
  const [twin, setTwin] = React.useState<Twin | null>(defaultTwin);
  const [consent, setConsent] = React.useState(false);
  const [ageAttested, setAgeAttested] = React.useState(false);
  const [selfie, setSelfie] = React.useState<UploadedFile | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [variantSelection, setVariantSelection] = React.useState<Record<string, string>>({});

  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [renderOutputUrl, setRenderOutputUrl] = React.useState<string | null>(null);
  const [, setRenderCount] = React.useState(0);

  const [showEmailGate, setShowEmailGate] = React.useState(false);
  const [emailSkippedOnce, setEmailSkippedOnce] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [hasEmail, setHasEmail] = React.useState(false);

  const attributedRef = React.useRef(false);
  React.useEffect(() => {
    if (!viaRenderId || attributedRef.current) return;
    attributedRef.current = true;
    fetch('/api/shoppers/attribution', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ renderId: viaRenderId }),
    }).catch(() => {});
  }, [viaRenderId]);

  async function submitRenderRequest(twinId: string) {
    setStage('render-pending');
    setErrorMessage(null);
    const res = await fetch('/api/renders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ linkId, productId, twinId, variantId: null }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.error?.code === 'INSUFFICIENT_CREDITS') {
        setErrorMessage("This shop's try-on is paused right now — check back soon.");
      } else if (json.error?.code === 'RATE_LIMITED') {
        setErrorMessage("You've reached today's try-on limit for this link.");
      } else {
        setErrorMessage(json.error?.message ?? 'Something went wrong. Please try again.');
      }
      setStage('error');
      return;
    }
    setRenderId(json.renderId);
    setRenderOutputUrl(null);
  }

  function handleSeeItOnYou() {
    if (preview) return;
    if (twin && twin.status === 'ready' && twin.twinUrl) {
      void submitRenderRequest(twin.id);
      return;
    }
    setStage('consent');
  }

  async function handleSelfieFiles(files: UploadedFile[]) {
    const file = files[0];
    if (!file) {
      setSelfie(null);
      return;
    }
    setSelfie(file);
    setErrorMessage(null);
    setStage('twin-pending');

    const res = await fetch('/api/twins', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selfieKey: file.key,
        selfieUrl: file.url,
        consent: true,
        ageAttested: true,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.error?.code === 'MODERATION_BLOCKED') {
        // Section 7.4: generic message, never the actual moderation reason.
        setErrorMessage("This photo can't be used. Please try a different one.");
      } else {
        setErrorMessage(json.error?.message ?? 'Something went wrong. Please try again.');
      }
      setStage('blocked');
      setSelfie(null);
      return;
    }
    setTwin({ id: json.twinId, status: 'pending', twinUrl: null });
  }

  // Poll twin status while pending.
  usePolling(
    async () => {
      if (!twin || twin.status !== 'pending') return false;
      const res = await fetch(`/api/twins/${twin.id}/status`);
      if (!res.ok) return false;
      const json = await res.json();
      if (json.status === 'ready') {
        const readyTwin = { id: twin.id, status: 'ready', twinUrl: json.twinUrl as string };
        setTwin(readyTwin);
        void submitRenderRequest(readyTwin.id);
        return false;
      }
      if (json.status === 'failed') {
        setErrorMessage("We couldn't build your model. Please try another photo.");
        setStage('blocked');
        return false;
      }
    },
    2000,
    stage === 'twin-pending' && twin?.status === 'pending',
  );

  // Poll render status while pending.
  usePolling(
    async () => {
      if (!renderId) return false;
      const res = await fetch(`/api/renders/${renderId}/status`);
      if (!res.ok) return false;
      const json = await res.json();
      if (json.status === 'succeeded' && json.outputUrl) {
        setRenderOutputUrl(json.outputUrl);
        setStage('result');
        setRenderCount((n) => {
          const next = n + 1;
          if (next >= 3 && !hasEmail && !emailSkippedOnce) setShowEmailGate(true);
          return next;
        });
        return false;
      }
      if (json.status === 'failed' || json.status === 'blocked') {
        setErrorMessage('This render failed. Please try again.');
        setStage('error');
        return false;
      }
    },
    2000,
    stage === 'render-pending' && !!renderId,
  );

  async function handleEmailGateSubmit() {
    if (!renderId || !email) return;
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, renderId }),
    }).catch(() => {});
    setHasEmail(true);
    setShowEmailGate(false);
  }

  async function handleBuyClick() {
    if (renderId) {
      fetch(`/api/renders/${renderId}/buy-click`, { method: 'POST' }).catch(() => {});
    }
    if (buyUrl) window.open(buyUrl, '_blank', 'noopener,noreferrer');
  }

  const steps: ProgressStep[] = [
    {
      label: 'Checking photo',
      state: stage === 'twin-pending' && !twin ? 'active' : selfie ? 'done' : 'pending',
    },
    {
      label: 'Building your model',
      state:
        stage === 'twin-pending' && twin?.status === 'pending'
          ? 'active'
          : twin?.status === 'ready'
            ? 'done'
            : 'pending',
    },
    {
      label: 'Dressing you',
      state: stage === 'render-pending' ? 'active' : stage === 'result' ? 'done' : 'pending',
    },
  ];

  const pageUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const messageHref = contactHref(contactChannel, productTitle, pageUrl);
  const price = formatPriceCents(priceCents, currency);

  return (
    <Container
      size="sm"
      data-brand={accentToken ?? undefined}
      className="flex flex-1 flex-col gap-4 py-6 pb-28"
    >
      {preview && (
        <InlineAlert tone="warning" title="Preview">
          This is a merchant preview — nothing here counts as a real visit.
        </InlineAlert>
      )}

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">{productTitle}</h1>
        {price && <p className="text-sm text-muted-foreground">{price}</p>}
      </div>

      <ImageReveal
        from={productImageUrl ?? ''}
        to={stage === 'result' ? renderOutputUrl : null}
        alt={productTitle}
      />

      {variantOptions.length > 0 && (
        <VariantPicker
          options={variantOptions}
          value={variantSelection}
          onChange={(name, valueId) =>
            setVariantSelection((prev) => ({ ...prev, [name]: valueId }))
          }
        />
      )}

      {(stage === 'twin-pending' || stage === 'render-pending') && (
        <ProgressSteps steps={steps} orientation="vertical" />
      )}

      {stage === 'consent' && (
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
            />
            <Label htmlFor="consent" className="text-sm leading-snug font-normal">
              I consent to my photo being used to generate a try-on render of myself.
            </Label>
          </div>
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="age"
              checked={ageAttested}
              onCheckedChange={(checked) => setAgeAttested(checked === true)}
            />
            <Label htmlFor="age" className="text-sm leading-snug font-normal">
              I am 18 or older and this is a photo of me.
            </Label>
          </div>
          {consent && ageAttested ? (
            <UploadDropzone capture="user" onFiles={handleSelfieFiles} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Check both boxes to take or upload a photo.
            </p>
          )}
        </div>
      )}

      {(stage === 'blocked' || stage === 'error') && errorMessage && (
        <InlineAlert tone="destructive">{errorMessage}</InlineAlert>
      )}
      {stage === 'blocked' && (
        <Button variant="outline" onClick={() => setStage('consent')}>
          Try another photo
        </Button>
      )}
      {stage === 'error' && (
        <Button variant="outline" onClick={() => setStage('idle')}>
          Try again
        </Button>
      )}

      {stage === 'result' && renderOutputUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <ShareSheet
            title={`See it on you at ${merchantName}`}
            url={renderId ? `${window.location.origin}/r/${renderId}` : pageUrl}
            onShare={() => {
              if (renderId)
                fetch(`/api/renders/${renderId}/share`, { method: 'POST' }).catch(() => {});
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
            <Button variant="outline" onClick={handleBuyClick}>
              Buy
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setStage('idle');
              setRenderId(null);
              setRenderOutputUrl(null);
            }}
          >
            Try another look
          </Button>
        </div>
      )}

      {showEmailGate && (
        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Save your looks</p>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleEmailGateSubmit} disabled={!email}>
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEmailSkippedOnce(true);
                setShowEmailGate(false);
              }}
            >
              Skip
            </Button>
          </div>
        </div>
      )}

      {stage === 'idle' && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Container size="sm" className="px-0">
            <Button className="w-full" size="lg" onClick={handleSeeItOnYou} disabled={preview}>
              See it on you
            </Button>
          </Container>
        </div>
      )}
    </Container>
  );
}
