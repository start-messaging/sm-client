import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  campaignsApi,
  type CreateCampaignBody,
  type UpdateCampaignBody,
} from '@/api/campaigns.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useCampaigns(slug: string) {
  return useQuery({
    queryKey: queryKeys.campaigns.all(slug),
    queryFn: () => campaignsApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

function useCampaignMutation<TArgs>(
  slug: string,
  fn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all(slug) }),
  });
}

export function useCreateCampaign(slug: string) {
  return useCampaignMutation(slug, (body: CreateCampaignBody) =>
    campaignsApi.create(slug, body),
  );
}

export function useUpdateCampaign(slug: string) {
  return useCampaignMutation(
    slug,
    (args: { id: string; body: UpdateCampaignBody }) =>
      campaignsApi.update(slug, args.id, args.body),
  );
}

export function useDeleteCampaign(slug: string) {
  return useCampaignMutation(slug, (id: string) =>
    campaignsApi.delete(slug, id),
  );
}

export function useLaunchCampaign(slug: string) {
  return useCampaignMutation(slug, (id: string) =>
    campaignsApi.launch(slug, id),
  );
}

export function usePauseCampaign(slug: string) {
  return useCampaignMutation(slug, (id: string) =>
    campaignsApi.pause(slug, id),
  );
}
