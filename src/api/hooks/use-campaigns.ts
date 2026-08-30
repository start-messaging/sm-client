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

export function useResumeCampaign(slug: string) {
  return useCampaignMutation(slug, (id: string) =>
    campaignsApi.resume(slug, id),
  );
}

export function useDuplicateCampaign(slug: string) {
  return useCampaignMutation(slug, (id: string) =>
    campaignsApi.duplicate(slug, id),
  );
}

export function useUploadCampaignAudienceCsv(slug: string) {
  return useCampaignMutation(
    slug,
    (args: { id: string; rows: Record<string, string>[] }) =>
      campaignsApi.uploadAudienceCsv(slug, args.id, args.rows),
  );
}

export function useCampaignAnalytics(slug: string, id: string) {
  return useQuery({
    queryKey: queryKeys.campaigns.analytics(slug, id),
    queryFn: () => campaignsApi.getAnalytics(slug, id),
    enabled: slug.length > 0 && id.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function useLastMarketingSend(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['campaigns', slug, 'last-marketing-send'] as const,
    queryFn: () => campaignsApi.getLastMarketingSend(slug),
    enabled: enabled && slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}
