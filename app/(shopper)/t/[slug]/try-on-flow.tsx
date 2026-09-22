'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineAlert } from '@/components/inline-alert';
import { ImageReveal } from '@/components/image-reveal';
import { VariantPicker, type VariantOption } from '@/components/variant-picker';
import { UploadDropzone, type UploadedFile } from '@/components/upload-dropzone';
import { ProgressSteps, type ProgressStep } from '@/components/progress-steps';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { ShareSheet } from '@/components/share-sheet';
import { Container } from '@/components/container';
import { SplitPane } from '@/components/split-pane';
import { Skeleton } from '@/components/ui/skeleton';
import { LanguageSuggestBanner } from '@/components/language-suggest-banner';
import { usePolling } from '@/hooks/use-polling';
import { useIsDesktop } from '@/hooks/use-media-query';
import { formatPriceCents } from '@/lib/util';
import type { ContactChannel } from '@/constants';

type Twin = { id: string; status: string; twinUrl: string | null };

export interface TryOnFlowProps {
  linkId: string;
  productId: string;
  productTitle: string;
  priceCents: number | null;
  currency: string | null;
  buyUrl: string | null;
  merchantName: string;
  contactChannel: ContactChannel | null;
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
  channel: ContactChannel | null,
  productTitle: string,
  pageUrl: string,
): string | null {
  if (!channel) return null;
  const text = encodeURIComponent(`Hi! I'm interested in ${productTitle}: ${pageUrl}`);
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
  const [errorMessage, setErrorMessageState] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);
  const setErrorMessage = (msg: string | null) => {
    setErrorMessageState(msg);
    if (msg) setErrorKey((k) => k + 1);
  };
  const [variantSelection, setVariantSelection] = React.useState<Record<string, string>>({});

  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [renderOutputUrl, setRenderOutputUrl] = React.useState<string | null>(null);
  const [, setRenderCount] = React.useState(0);

  const [showEmailGate, setShowEmailGate] = React.useState(false);
  const [emailSkippedOnce, setEmailSkippedOnce] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [hasEmail, setHasEmail] = React.useState(false);
  const [retargetOptIn, setRetargetOptIn] = React.useState(false);

  const attributionMutation = useMutation({
    mutationFn: (renderId: string) =>
      fetch('/api/shoppers/attribution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ renderId }),
      }),
  });
  const attributeRender = attributionMutation.mutate;
  const attributedRef = React.useRef(false);
  React.useEffect(() => {
    if (!viaRenderId || attributedRef.current) return;
    attributedRef.current = true;
    attributeRender(viaRenderId);
  }, [viaRenderId, attributeRender]);

  const renderMutation = useMutation({
    mutationFn: async (twinId: string) => {
      const res = await fetch('/api/renders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ linkId, productId, twinId, variantId: null }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message =
          json.error?.code === 'INSUFFICIENT_CREDITS'
            ? "This shop's try-on is paused right now. Check back soon."
            : json.error?.code === 'RATE_LIMITED'
              ? "You've reached today's try-on limit for this link."
              : (json.error?.message ?? 'Something went wrong. Please try again.');
        throw new Error(message);
      }
      return json as { renderId: string };
    },
  });

  // Guards against a double-click (or any other double-invocation) firing
  // two /api/renders POSTs for the same "see it on you" gesture, which would
  // reserve and burn two credits for one shopper action. The Idempotency-Key
  // header above additionally lets the server dedupe a genuine network-level
  // retry of the same request, per api-handler's Idempotency-Key support.
  const renderRequestInFlight = React.useRef(false);

  async function submitRenderRequest(twinId: string) {
    if (renderRequestInFlight.current) return;
    renderRequestInFlight.current = true;
    setStage('render-pending');
    setErrorMessage(null);
    try {
      const json = await renderMutation.mutateAsync(twinId);
      setRenderId(json.renderId);
      setRenderOutputUrl(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setStage('error');
    } finally {
      renderRequestInFlight.current = false;
    }
  }

  function handleSeeItOnYou() {
    if (preview) return;
    if (twin && twin.status === 'ready' && twin.twinUrl) {
      void submitRenderRequest(twin.id);
      return;
    }
    setStage('consent');
  }

  const createTwinMutation = useMutation({
    mutationFn: async (file: UploadedFile) => {
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
        const message =
          json.error?.code === 'MODERATION_BLOCKED'
            ? "This photo can't be used. Please try a different one."
            : (json.error?.message ?? 'Something went wrong. Please try again.');
        throw new Error(message);
      }
      return json as { twinId: string };
    },
  });

  async function handleSelfieFiles(files: UploadedFile[]) {
    const file = files[0];
    if (!file) {
      setSelfie(null);
      return;
    }
    setSelfie(file);
    setErrorMessage(null);
    setStage('twin-pending');

    try {
      const json = await createTwinMutation.mutateAsync(file);
      setTwin({ id: json.twinId, status: 'pending', twinUrl: null });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setStage('blocked');
      setSelfie(null);
    }
  }

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

  const leadMutation = useMutation({
    mutationFn: (vars: { email: string; renderId: string; retargetOptIn: boolean }) =>
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSettled: () => {
      setHasEmail(true);
      setShowEmailGate(false);
    },
  });

  function handleEmailGateSubmit() {
    if (!renderId || !email) return;
    leadMutation.mutate({ email, renderId, retargetOptIn });
  }

  async function handleBuyClick() {
    if (renderId) {
      fetch(`/api/renders/${renderId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'buy_click' }),
      }).catch(() => {});
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
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const dialogOpen = !isDesktop && stage !== 'idle' && stage !== 'result';

  function handleDialogOpenChange(open: boolean) {
    if (open || stage === 'result') return;
    setStage('idle');
    setSelfie(null);
    setErrorMessage(null);
  }

  const flowStageContent = (
    <div className="flex flex-col gap-4">
      {stage === 'consent' && (
        <div className="space-y-4">
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
            <UploadDropzone capture="user" onFiles={handleSelfieFiles} className="w-56" />
          ) : (
            <p className="text-xs text-muted-foreground">
              Check both boxes to take or upload a photo.
            </p>
          )}
        </div>
      )}

      {(stage === 'twin-pending' || stage === 'render-pending') && (
        <ProgressSteps steps={steps} orientation="vertical" />
      )}

      {(stage === 'blocked' || stage === 'error') && errorMessage && (
        <InlineAlert tone="destructive" resetKey={errorKey}>
          {errorMessage}
        </InlineAlert>
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
    </div>
  );

  const resultActions = stage === 'result' && renderOutputUrl && (
    <div className="flex flex-wrap items-center gap-2">
      <ShareSheet
        title={`See it on you at ${merchantName}`}
        url={renderId ? `${window.location.origin}/r/${renderId}` : pageUrl}
        onShare={() => {
          if (renderId)
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
  );

  const emailGate = showEmailGate && (
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
  );

  const productImage = (
    <div className="flex flex-col gap-4">
      <ImageReveal
        from={productImageUrl ?? ''}
        to={stage === 'result' ? renderOutputUrl : null}
        alt={productTitle}
        zoomable
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
    </div>
  );

  if (!mounted) {
    // isDesktop is only known after hydration (useIsDesktop's SSR snapshot
    // is always false), so the desktop/mobile branches below would flash
    // mobile-then-desktop on every load otherwise. This skeleton uses the
    // same md: breakpoint as SplitPane so it's correct immediately, no JS
    // needed, then swaps directly to the right real layout once mounted.
    return (
      <Container size="lg" className="grid flex-1 grid-cols-1 gap-6 py-6 md:grid-cols-2 md:py-10">
        <Skeleton className="aspect-3/4 w-full rounded-md" />
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="hidden h-11 w-full rounded-md md:block" />
        </div>
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
          <Container size="sm" className="px-0">
            <Skeleton className="h-11 w-full rounded-md" />
          </Container>
        </div>
      </Container>
    );
  }

  if (isDesktop) {
    return (
      <Container
        size="lg"
        data-brand={accentToken ?? undefined}
        className="flex flex-1 flex-col gap-4 py-10"
      >
        {preview && (
          <InlineAlert tone="warning" title="Preview">
            This is a merchant preview, nothing here counts as a real visit.
          </InlineAlert>
        )}
        <LanguageSuggestBanner />

        <SplitPane
          start={productImage}
          end={
            <div className="flex flex-col gap-5">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{merchantName}</p>
                <h1 className="text-2xl font-medium text-foreground">{productTitle}</h1>
                {price && <p className="text-sm text-muted-foreground">{price}</p>}
              </div>

              {stage === 'idle' && (
                <Button size="lg" onClick={handleSeeItOnYou} disabled={preview}>
                  See it on you
                </Button>
              )}

              {flowStageContent}
              {resultActions}
              {emailGate}
            </div>
          }
        />
      </Container>
    );
  }

  return (
    <Container
      size="sm"
      data-brand={accentToken ?? undefined}
      className="flex flex-1 flex-col gap-4 py-6 pb-28"
    >
      {preview && (
        <InlineAlert tone="warning" title="Preview">
          This is a merchant preview, nothing here counts as a real visit.
        </InlineAlert>
      )}
      <LanguageSuggestBanner />

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">{productTitle}</h1>
        {price && <p className="text-sm text-muted-foreground">{price}</p>}
      </div>

      {productImage}

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        title="See it on you"
      >
        {flowStageContent}
      </ResponsiveDialog>

      {resultActions}
      {emailGate}

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
