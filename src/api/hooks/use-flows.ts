import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flowsApi,
  type CreateFlowBody,
  type PatchFlowBody,
} from '@/api/flows.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useFlows(slug: string) {
  return useQuery({
    queryKey: queryKeys.flows.all(slug),
    queryFn: () => flowsApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function useFlow(slug: string, id: string) {
  return useQuery({
    queryKey: queryKeys.flows.byId(slug, id),
    queryFn: () => flowsApi.get(slug, id),
    enabled: slug.length > 0 && id.length > 0,
    staleTime: STALE.STANDARD,
  });
}

function useFlowMutation<TArgs>(
  slug: string,
  fn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.flows.all(slug) }),
  });
}

export function useCreateFlow(slug: string) {
  return useFlowMutation(slug, (body: CreateFlowBody) =>
    flowsApi.create(slug, body),
  );
}

export function usePatchFlow(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: PatchFlowBody }) =>
      flowsApi.patch(slug, args.id, args.body),
    onSuccess: (_data, args) => {
      void qc.invalidateQueries({ queryKey: queryKeys.flows.all(slug) });
      void qc.invalidateQueries({
        queryKey: queryKeys.flows.byId(slug, args.id),
      });
    },
  });
}

export function useDeleteFlow(slug: string) {
  return useFlowMutation(slug, (id: string) => flowsApi.delete(slug, id));
}

export function useActivateFlow(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flowsApi.activate(slug, id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.flows.all(slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.flows.byId(slug, id) });
    },
  });
}

export function useDeactivateFlow(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flowsApi.deactivate(slug, id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.flows.all(slug) });
      void qc.invalidateQueries({ queryKey: queryKeys.flows.byId(slug, id) });
    },
  });
}

export function useTriggerFlow(slug: string) {
  return useMutation({
    mutationFn: ({ id, contactId }: { id: string; contactId: string }) =>
      flowsApi.triggerOnContact(slug, id, contactId),
  });
}
