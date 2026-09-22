import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closetResponseSchema, type ClosetResponse } from '@tryonlink/shared';
import { apiFetch } from '@/lib/shopper-session';
import { readApiError } from './errors';

export function useCloset() {
  return useQuery<ClosetResponse>({
    queryKey: ['closet'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error(await readApiError(res, "Couldn't load your closet"));
      return closetResponseSchema.parse(await res.json());
    },
  });
}

export function useDeleteRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (renderId: string) => apiFetch(`/api/renders/${renderId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closet'] }),
  });
}
