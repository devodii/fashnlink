import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createRenderResponseSchema,
  renderStatusResponseSchema,
  type RenderStatusResponse,
} from '@tryonlink/shared';
import { apiFetch } from '@/lib/shopper-session';

export interface CreateRenderInput {
  linkId: string;
  productId: string;
  twinId: string;
  variantId: string | null;
}

export function useCreateRender() {
  return useMutation({
    mutationFn: async (input: CreateRenderInput) => {
      const res = await apiFetch('/api/renders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(input),
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
      return createRenderResponseSchema.parse(json);
    },
  });
}

/**
 * Same 2s polling cadence as web, and the same real-failure-reason surfacing
 * as apps/web-app/app/(shopper)/product-render-card.tsx: a failed/blocked
 * status carries the render's real `error.message`, not a bare "try again".
 */
export function useRenderStatus(renderId: string | null, enabled: boolean) {
  return useQuery<RenderStatusResponse>({
    queryKey: ['render-status', renderId],
    enabled: !!renderId && enabled,
    queryFn: async () => {
      const res = await apiFetch(`/api/renders/${renderId}/status`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong');
      return renderStatusResponseSchema.parse(json);
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'succeeded' || status === 'failed' || status === 'blocked' ? false : 2000;
    },
  });
}

export function renderFailureMessage(status: RenderStatusResponse | undefined): string {
  const fromServer = status?.error?.message;
  return fromServer && fromServer.length > 0 ? fromServer : 'This render failed. Please try again.';
}

export function useRecordRenderEvent() {
  return useMutation({
    mutationFn: (vars: { renderId: string; event: 'share' | 'buy_click' }) =>
      apiFetch(`/api/renders/${vars.renderId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: vars.event }),
      }),
  });
}
