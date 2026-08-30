import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { metaFlowsApi } from '@/api/meta-flows.api';
import { queryKeys } from '@/api/query-keys';

export function useMetaFlows() {
  const ws = useCurrentWorkspace();
  return useQuery({
    queryKey: queryKeys.metaFlows.list(ws.slug),
    queryFn: () => metaFlowsApi.list(ws.slug),
    enabled: !!ws.slug,
  });
}

export function useSyncMetaFlows() {
  const ws = useCurrentWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => metaFlowsApi.sync(ws.slug),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.metaFlows.list(ws.slug) });
    },
  });
}
