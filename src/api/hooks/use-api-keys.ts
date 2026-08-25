import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '@/api/api-keys.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useApiKeys(slug: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys.all(slug),
    queryFn: () => apiKeysApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function useCreateApiKey(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => apiKeysApi.create(slug, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.all(slug) }),
  });
}

export function useRevokeApiKey(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(slug, id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.all(slug) }),
  });
}
