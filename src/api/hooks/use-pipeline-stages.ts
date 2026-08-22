import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import type { PipelineStagesResult } from '@/api/messages.api';

export function usePipelineStages(slug: string) {
  return useQuery({
    queryKey: queryKeys.whatsappInbox.pipelineStages(slug),
    queryFn: () =>
      apiGet<PipelineStagesResult>(
        endpoints.whatsappInbox.pipelineStages(slug),
      ),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}
