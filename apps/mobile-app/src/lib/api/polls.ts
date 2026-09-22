import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pollDetailResponseSchema,
  pollStateResponseSchema,
  type PollDetailResponse,
  type PollStateResponse,
} from '@tryonlink/shared';
import { apiFetch } from '@/lib/shopper-session';
import { readApiError } from './errors';

export function usePollDetail(slug: string, creatorShopperId?: string) {
  return useQuery<PollDetailResponse>({
    queryKey: ['poll-detail', slug, creatorShopperId ?? null],
    queryFn: async () => {
      const search = creatorShopperId ? `?creatorShopperId=${creatorShopperId}` : '';
      const res = await apiFetch(`/api/public/polls/${slug}${search}`);
      if (!res.ok) throw new Error(await readApiError(res, "Couldn't load this poll"));
      return pollDetailResponseSchema.parse(await res.json());
    },
  });
}

export function usePollState(linkId: string | null) {
  return useQuery<PollStateResponse>({
    queryKey: ['poll-state', linkId],
    enabled: !!linkId,
    queryFn: async () => {
      const res = await apiFetch(`/api/polls/${linkId}`);
      if (!res.ok) throw new Error(await readApiError(res, "Couldn't load poll results"));
      return pollStateResponseSchema.parse(await res.json());
    },
  });
}

export function useCastPollVote(linkId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (renderId: string) => {
      const res = await apiFetch(`/api/polls/${linkId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'vote', renderId }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Couldn't record your vote"));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['poll-state', linkId] }),
  });
}
