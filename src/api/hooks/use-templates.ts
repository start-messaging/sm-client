import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { templatesApi, type CreateTemplateBody } from '@/api/templates.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useTemplates(slug: string) {
  return useQuery({
    queryKey: queryKeys.templates.all(slug),
    queryFn: () => templatesApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function useCreateTemplate(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTemplateBody) => templatesApi.create(slug, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.templates.all(slug) });
    },
  });
}

export function useDeleteTemplate(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(slug, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.templates.all(slug) });
    },
  });
}

/** Refresh template statuses from Meta (fires the sync endpoint). */
export function useSyncTemplates(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => templatesApi.sync(slug),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.templates.all(slug) });
    },
  });
}
