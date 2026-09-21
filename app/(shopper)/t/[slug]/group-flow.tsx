'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [consent, setConsent] = React.useState(false);
  const [ageAttested, setAgeAttested] = React.useState(false);
  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [outputUrl, setOutputUrl] = React.useState<string | null>(null);
  const [renderPending, setRenderPending] = React.useState(false);
  const [variantSelection, setVariantSelection] = React.useState<Record<string, string>>({});
  const [showInGroup, setShowInGroup] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [joined, setJoined] = React.useState(false);

  const twinReady = twin?.status === 'ready' && !!twin.twinUrl;

  const rosterQuery = useQuery({
    queryKey: ['group-roster', linkId],
    queryFn: async (): Promise<{ memberCount: number; avatars: { src: string }[] }> => {
      const res = await fetch(`/api/groups/${linkId}`);
      const json = await res.json();
      return { memberCount: json.memberCount ?? 0, avatars: json.avatars ?? [] };
    },
  });
  const roster = rosterQuery.data ?? { memberCount: 0, avatars: [] };

  const tryOnMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/renders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          linkId,
          productId,
          twinId: twin!.id,
          variantId: null,
          via: 'group',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'could not start this render');
      return json as { renderId: string };
    },
    onMutate: () => setRenderPending(true),
    onSuccess: (json) => setRenderId(json.renderId),
    onError: () => setRenderPending(false),
  });

  function handleTryOn() {
    if (!twin || !twinReady) return;
    tryOnMutation.mutate();
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
  const joinMutation = useMutation({
    mutationFn: async () => {
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
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-roster', linkId] }),
    onSettled: () => setJoined(true),
  });

  function handleJoin() {
    if (!renderId) return;
    joinMutation.mutate();
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6 pb-10">
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

      <ImageReveal from={productImageUrl ?? ''} to={outputUrl} alt={productTitle} zoomable />
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
