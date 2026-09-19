'use client';

import * as React from 'react';
import { usePolling } from '@/hooks/use-polling';
import type { UploadedFile } from '@/components/upload-dropzone';

export type ShopperTwin = { id: string; status: string; twinUrl: string | null };

// DECISION: `TryOnFlow` (single-link mode, M4) already has an inline
// consent -> upload -> twin-creation -> poll sequence, but it's tightly
// woven into that component's single-render state machine. Poll/group mode
// need the SAME twin once, then reuse it across several renders — rather
// than risk regressing M4's already-shipped, tested single-link flow by
// extracting from it under time pressure, this is a small independent copy
// of just the twin half. Some duplication with `TryOnFlow` as a result;
// worth unifying later, not worth the regression risk now.
export function useShopperTwin(defaultTwin: ShopperTwin | null) {
  const [twin, setTwin] = React.useState<ShopperTwin | null>(defaultTwin);
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'blocked'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function submitSelfie(files: UploadedFile[]) {
    const file = files[0];
    if (!file) return;
    setErrorMessage(null);
    setStatus('pending');

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
      setErrorMessage(
        json.error?.code === 'MODERATION_BLOCKED'
          ? "This photo can't be used. Please try a different one."
          : (json.error?.message ?? 'Something went wrong. Please try again.'),
      );
      setStatus('blocked');
      return;
    }
    setTwin({ id: json.twinId, status: 'pending', twinUrl: null });
  }

  usePolling(
    async () => {
      if (!twin || twin.status !== 'pending') return false;
      const res = await fetch(`/api/twins/${twin.id}/status`);
      if (!res.ok) return false;
      const json = await res.json();
      if (json.status === 'ready') {
        setTwin({ id: twin.id, status: 'ready', twinUrl: json.twinUrl as string });
        setStatus('idle');
        return false;
      }
      if (json.status === 'failed') {
        setErrorMessage("We couldn't build your model. Please try another photo.");
        setStatus('blocked');
        return false;
      }
    },
    2000,
    status === 'pending' && twin?.status === 'pending',
  );

  return { twin, status, errorMessage, submitSelfie, reset: () => setStatus('idle') };
}
