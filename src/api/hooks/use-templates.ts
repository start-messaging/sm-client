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

/** Upload a file to R2, get back a public URL for header media in campaigns/inbox. */
export function useUploadMediaSample(slug: string) {
  return useMutation({
    mutationFn: (file: File) => templatesApi.uploadMediaSample(slug, file),
  });
}

/** Upload a sample to Meta's Resumable Upload API — required for media-header create. */
export function useUploadTemplateMedia(slug: string) {
  return useMutation({
    mutationFn: (file: File) => templatesApi.uploadMedia(slug, file),
  });
}
