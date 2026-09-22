import { useQuery } from '@tanstack/react-query';
import { linkDetailResponseSchema, type LinkDetailResponse } from '@tryonlink/shared';
import { apiFetch } from '@/lib/shopper-session';
import { readApiError } from './errors';

export function useLinkDetail(slug: string) {
  return useQuery<LinkDetailResponse>({
    queryKey: ['link-detail', slug],
    queryFn: async () => {
      const res = await apiFetch(`/api/public/links/${slug}`);
      if (!res.ok) throw new Error(await readApiError(res, "Couldn't load this link"));
      return linkDetailResponseSchema.parse(await res.json());
    },
  });
}
