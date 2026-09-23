'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { InlineAlert } from '@/components/inline-alert';
import { UploadDropzone } from '@/components/upload-dropzone';
import { Container } from '@/components/container';
import { CopyField } from '@/components/copy-field';
import { LanguageSuggestBanner } from '@/components/language-suggest-banner';
import { useShopperTwin, type ShopperTwin } from '../../use-shopper-twin';
import { ProductRenderCard } from '../../product-render-card';

export interface PollFlowProduct {
  id: string;
  title: string;
  imageUrl: string | null;
}

export interface PollFlowProps {
  linkId: string;
  slug: string;
  merchantName: string;
  products: PollFlowProduct[];
  defaultTwin: ShopperTwin | null;
  shopperId: string | null;
  preview: boolean;
}

export function PollFlow({
  linkId,
  slug,
  merchantName,
  products,
  defaultTwin,
  shopperId,
  preview,
}: PollFlowProps) {
  const { twin, status, errorMessage, errorKey, submitSelfie } = useShopperTwin(defaultTwin);
  const [consent, setConsent] = React.useState(false);
  const [ageAttested, setAgeAttested] = React.useState(false);
  const [renderedCount, setRenderedCount] = React.useState(0);

  const twinReady = twin?.status === 'ready' && !!twin.twinUrl;
  const allRendered = renderedCount >= products.length;
  const shareUrl =
    typeof window !== 'undefined' && shopperId
      ? `${window.location.origin}/p/${slug}?s=${shopperId}`
      : '';

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6 pb-10">
      <LanguageSuggestBanner />

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">
          Try {products.length} looks, ask friends
        </h1>
      </div>

      {!twinReady && (
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
          {!preview && (
            <>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(c) => setConsent(c === true)}
                />
                <Label htmlFor="consent" className="text-sm leading-snug font-normal">
                  I consent to my photo being used to generate try-on renders of myself.
                </Label>
              </div>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="age"
                  checked={ageAttested}
                  onCheckedChange={(c) => setAgeAttested(c === true)}
                />
                <Label htmlFor="age" className="text-sm leading-snug font-normal">
                  I am 18 or older and this is a photo of me.
                </Label>
              </div>
            </>
          )}
          {preview || (consent && ageAttested) ? (
            <UploadDropzone capture="user" onFiles={submitSelfie} className="w-56" />
          ) : (
            <p className="text-xs text-muted-foreground">
              Check both boxes to take or upload a photo.
            </p>
          )}
          {status === 'pending' && (
            <p className="text-sm text-muted-foreground">Building your model…</p>
          )}
          {status === 'blocked' && errorMessage && (
            <InlineAlert tone="destructive" resetKey={errorKey}>
              {errorMessage}
            </InlineAlert>
          )}
        </div>
      )}

      {twinReady && (
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <ProductRenderCard
              key={product.id}
              linkId={linkId}
              productId={product.id}
              productTitle={product.title}
              productImageUrl={product.imageUrl}
              twinId={twin!.id}
              via="poll"
              onRendered={() => setRenderedCount((n) => n + 1)}
            />
          ))}
        </div>
      )}

      {allRendered && shareUrl && (
        <div className="space-y-2 rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Ask friends which one</p>
          <CopyField value={shareUrl} />
        </div>
      )}
    </Container>
  );
}
