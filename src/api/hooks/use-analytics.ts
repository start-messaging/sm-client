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
