'use client';

import * as React from 'react';
import { usePolling } from '@/hooks/use-polling';
import type { UploadedFile } from '@/components/upload-dropzone';

export type ShopperTwin = { id: string; status: string; twinUrl: string | null };

/**
 * `TryOnFlow` has its own inline consent -> upload -> twin-creation -> poll
 * sequence, tightly woven into that component's single-render state
 * machine. This is a deliberate independent copy of just the twin half, not
 * a shared extraction, so poll/group mode don't risk regressing that
 * already-shipped flow.
 */
export function useShopperTwin(defaultTwin: ShopperTwin | null) {
  const [twin, setTwin] = React.useState<ShopperTwin | null>(defaultTwin);
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'blocked'>('idle');
  const [errorMessage, setErrorMessageState] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);
  const setErrorMessage = (msg: string | null) => {
    setErrorMessageState(msg);
    if (msg) setErrorKey((k) => k + 1);
  };

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

  return { twin, status, errorMessage, errorKey, submitSelfie, reset: () => setStatus('idle') };
}
