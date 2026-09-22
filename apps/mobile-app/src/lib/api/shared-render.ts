import { useQuery } from '@tanstack/react-query';
import { sharedRenderResponseSchema, type SharedRenderResponse } from '@tryonlink/shared';
import { apiFetch } from '@/lib/shopper-session';
import { readApiError } from './errors';

export function useSharedRender(renderId: string) {
  return useQuery<SharedRenderResponse>({
    queryKey: ['shared-render', renderId],
    queryFn: async () => {
      const res = await apiFetch(`/api/public/renders/${renderId}`);
      if (!res.ok) throw new Error(await readApiError(res, "This look isn't available anymore"));
      return sharedRenderResponseSchema.parse(await res.json());
    },
  });
}
