'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineAlert } from '@/components/inline-alert';
import { ImageReveal } from '@/components/image-reveal';
import { UploadDropzone } from '@/components/upload-dropzone';
import { VariantPicker, type VariantOption } from '@/components/variant-picker';
import { AvatarStack } from '@/components/avatar-stack';
import { Container } from '@/components/container';
import { LanguagePicker } from '@/components/language-picker';
import { LanguageSuggestBanner } from '@/components/language-suggest-banner';
import { usePolling } from '@/hooks/use-polling';
import { useShopperTwin, type ShopperTwin } from '../../use-shopper-twin';

export interface GroupFlowProps {
  linkId: string;
  merchantName: string;
  groupName: string;
  groupNote: string | null;
  productId: string;
  productTitle: string;
  productImageUrl: string | null;
  variantOptions: VariantOption[];
  defaultTwin: ShopperTwin | null;
}

export function GroupFlow({
  linkId,
  merchantName,
  groupName,
  groupNote,
  productId,
  productTitle,
  productImageUrl,
  variantOptions,
  defaultTwin,
}: GroupFlowProps) {
  const { twin, status, errorMessage, errorKey, submitSelfie } = useShopperTwin(defaultTwin);
  const [consent, setConsent] = React.useState(false);
  const [ageAttested, setAgeAttested] = React.useState(false);
  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [renderPending, setRenderPending] = React.useState(false);
  const [variantSelection, setVariantSelection] = React.useState<Record<string, string>>({});
  const [showInGroup, setShowInGroup] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [joined, setJoined] = React.useState(false);
  const [roster, setRoster] = React.useState<{ memberCount: number; avatars: { src: string }[] }>({
    memberCount: 0,
    avatars: [],
  });

  const twinReady = twin?.status === 'ready' && !!twin.twinUrl;

  React.useEffect(() => {
    fetch(`/api/groups/${linkId}`)
      .then((r) => r.json())
      .then((json) =>
        setRoster({ memberCount: json.memberCount ?? 0, avatars: json.avatars ?? [] }),
      )
      .catch(() => {});
  }, [linkId]);

  async function handleTryOn() {
    if (!twin || !twinReady) return;
    setRenderPending(true);
    const res = await fetch('/api/renders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ linkId, productId, twinId: twin.id, variantId: null, via: 'group' }),
    });
    const json = await res.json();
    if (res.ok) setRenderId(json.renderId);
    else setRenderPending(false);
  }

  usePolling(
    async () => {
      if (!renderId) return false;
      const res = await fetch(`/api/renders/${renderId}/status`);
      if (!res.ok) return false;
      const json = await res.json();
      if (json.status === 'succeeded' && json.outputUrl) {
        setOutputUrl(json.outputUrl);
        setRenderPending(false);
        return false;
      }
      if (json.status === 'failed' || json.status === 'blocked') {
        setRenderPending(false);
        return false;
      }
    },
    2000,
    renderPending && !!renderId,
  );

  /**
   * `chosenVariantId` has no size+color -> variant-row lookup wired up yet,
   * so it's always null; the picks still reach the merchant as free text in
   * `note` instead of being silently dropped.
   */
  async function handleJoin() {
    if (!renderId) return;
    const variantNote = Object.entries(variantSelection)
      .map(([name, value]) => `${name}: ${value}`)
      .join(', ');
    await fetch(`/api/groups/${linkId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        renderId,
        chosenVariantId: null,
        note: [note, variantNote].filter(Boolean).join('; ') || null,
        showInGroup,
      }),
    }).catch(() => {});
    setJoined(true);
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6 pb-10">
      <div className="flex justify-end">
        <LanguagePicker compact />
      </div>
      <LanguageSuggestBanner />
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">{groupName}</h1>
        {groupNote && <p className="text-sm text-muted-foreground">{groupNote}</p>}
      </div>

      {roster.avatars.length > 0 && (
        <div className="flex items-center gap-2">
          <AvatarStack items={roster.avatars.map((a) => ({ src: a.src, alt: 'Group member' }))} />
          <p className="text-xs text-muted-foreground">{roster.memberCount} in this group</p>
        </div>
      )}

      <ImageReveal from={productImageUrl ?? ''} to={outputUrl} alt={productTitle} />
      <p className="text-sm text-foreground">{productTitle}</p>

      {variantOptions.length > 0 && (
        <VariantPicker
          options={variantOptions}
          value={variantSelection}
          onChange={(name, valueId) =>
            setVariantSelection((prev) => ({ ...prev, [name]: valueId }))
          }
        />
      )}

      {!twinReady && (
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(c) => setConsent(c === true)}
            />
            <Label htmlFor="consent" className="text-sm leading-snug font-normal">
              I consent to my photo being used to generate a try-on render of myself.
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
          {consent && ageAttested ? (
            <UploadDropzone capture="user" onFiles={submitSelfie} />
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

      {twinReady && !renderId && (
        <Button onClick={handleTryOn} disabled={renderPending}>
          Try it on you
        </Button>
      )}

      {outputUrl && !joined && (
        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">I&apos;m in</p>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="show-in-group"
              checked={showInGroup}
              onCheckedChange={(c) => setShowInGroup(c === true)}
            />
            <Label htmlFor="show-in-group" className="text-sm leading-snug font-normal">
              Show my look to the rest of the group.
            </Label>
          </div>
          <Button onClick={handleJoin} className="w-full">
            I&apos;m in
          </Button>
        </div>
      )}

      {joined && (
        <InlineAlert tone="success">You&apos;re in! The organizer can see your pick.</InlineAlert>
      )}
    </Container>
  );
}
