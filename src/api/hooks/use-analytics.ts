import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

/** Dashboard overview widget: today's conversations, resolutions, top agents. */
export function useAnalyticsOverview(slug: string) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(slug),
    queryFn: () => analyticsApi.getOverview(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function useAgentStats(slug: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.agentStats(slug, from, to),
    queryFn: () => analyticsApi.getAgentStats(slug, from, to),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function useMessageErrors(slug: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.messageErrors(slug, from, to),
    queryFn: () => analyticsApi.getMessageErrors(slug, from, to),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}
