import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createTwinResponseSchema,
  twinStatusResponseSchema,
  type TwinStatusResponse,
} from '@tryonlink/shared';
import { apiFetch } from '@/lib/shopper-session';
import { readApiError } from './errors';

export function useCreateTwin() {
  return useMutation({
    mutationFn: async (selfie: { key: string; url: string }) => {
      const res = await apiFetch('/api/twins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          selfieKey: selfie.key,
          selfieUrl: selfie.url,
          consent: true,
          ageAttested: true,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message =
          json?.error?.code === 'MODERATION_BLOCKED'
            ? "This photo can't be used. Please try a different one."
            : (json?.error?.message ?? 'Something went wrong. Please try again.');
        throw new Error(message);
      }
      return createTwinResponseSchema.parse(await res.json());
    },
  });
}

/** Same 2s polling cadence as apps/web-app/app/(shopper)/use-shopper-twin.ts. */
export function useTwinStatus(twinId: string | null, enabled: boolean) {
  return useQuery<TwinStatusResponse>({
    queryKey: ['twin-status', twinId],
    enabled: !!twinId && enabled,
    queryFn: async () => {
      const res = await apiFetch(`/api/twins/${twinId}/status`);
      if (!res.ok) throw new Error(await readApiError(res, 'Something went wrong'));
      return twinStatusResponseSchema.parse(await res.json());
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'ready' || status === 'failed' ? false : 2000;
    },
  });
}
