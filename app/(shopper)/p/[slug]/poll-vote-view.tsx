'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { InlineAlert } from '@/components/inline-alert';
import { UploadDropzone } from '@/components/upload-dropzone';
import { Container } from '@/components/container';
import { PollOptions } from '@/components/poll-options';
import { useShopperTwin, type ShopperTwin } from '../../use-shopper-twin';
import { ProductRenderCard } from '../../product-render-card';

export interface PollVoteOption {
  productId: string;
  productTitle: string;
  renderId: string;
  imageUrl: string;
}

export interface PollVoteViewProps {
  linkId: string;
  merchantName: string;
  options: PollVoteOption[];
  closed: boolean;
  defaultTwin: ShopperTwin | null;
}

export function PollVoteView({
  linkId,
  merchantName,
  options,
  closed,
  defaultTwin,
}: PollVoteViewProps) {
  const { twin, status, errorMessage, errorKey, submitSelfie } = useShopperTwin(defaultTwin);
  const queryClient = useQueryClient();
  const [consent, setConsent] = React.useState(false);
  const [ageAttested, setAgeAttested] = React.useState(false);
  const [myVote, setMyVote] = React.useState<string | null>(null);
  const [showTwinFlow, setShowTwinFlow] = React.useState(false);

  const votesQueryKey = ['poll-votes', linkId] as const;
  const votesQuery = useQuery({
    queryKey: votesQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/polls/${linkId}`);
      const json = await res.json();
      return (json.votesByRenderId ?? {}) as Record<string, number>;
    },
  });
  const votes = votesQuery.data ?? {};

  const voteMutation = useMutation({
    mutationFn: (renderId: string) =>
      fetch(`/api/polls/${linkId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'vote', renderId }),
      }),
    onMutate: (renderId) => {
      queryClient.setQueryData<Record<string, number>>(votesQueryKey, (prev) => ({
        ...(prev ?? {}),
        [renderId]: (prev?.[renderId] ?? 0) + 1,
      }));
    },
  });

  function handleVote(renderId: string) {
    if (closed || myVote) return;
    setMyVote(renderId);
    voteMutation.mutate(renderId);
  }

  const twinReady = twin?.status === 'ready' && !!twin.twinUrl;

  if (options.length === 0) {
    return (
      <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
        <InlineAlert tone="warning">
          This poll doesn&apos;t have any looks to vote on yet.
        </InlineAlert>
      </Container>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6 pb-10">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{merchantName}</p>
        <h1 className="text-lg font-medium text-foreground">Which one?</h1>
        {closed && <p className="text-sm text-muted-foreground">This poll is closed.</p>}
      </div>

      <PollOptions
        options={options.map((o) => ({
          id: o.renderId,
          image: o.imageUrl,
          label: o.productTitle,
          votes: votes[o.renderId] ?? 0,
        }))}
        value={myVote ?? undefined}
        onVote={handleVote}
        results={!!myVote || closed}
      />

      {!twinReady && !showTwinFlow && (
        <button
          type="button"
          className="text-left text-sm text-muted-foreground underline underline-offset-2"
          onClick={() => setShowTwinFlow(true)}
        >
          See these on you too
        </button>
      )}

      {!twinReady && showTwinFlow && (
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
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

      {twinReady && (
        <div className="grid grid-cols-2 gap-4">
          {options.map((option) => (
            <ProductRenderCard
              key={option.productId}
              linkId={linkId}
              productId={option.productId}
              productTitle={option.productTitle}
              productImageUrl={option.imageUrl}
              twinId={twin!.id}
              via="poll"
            />
          ))}
        </div>
      )}
    </Container>
  );
}
