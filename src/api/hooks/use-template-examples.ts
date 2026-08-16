import { useQuery } from '@tanstack/react-query';
import { templateExamplesApi } from '@/api/template-examples.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

/**
 * Fetches admin-published template examples for the gallery.
 * Gallery calls are workspace-scoped but the data is global (same for every
 * workspace); the slug is kept in the key so the query fits workspace auth.
 *
 * Stale for 1 hour — the curated list changes rarely.
 * On error the hook returns isError=true and data=undefined; the gallery
 * falls back to the local TEMPLATE_EXAMPLES constant.
 */
export function useTemplateExamples(slug: string) {
  return useQuery({
    queryKey: queryKeys.templateExamples.list(slug),
    queryFn: () => templateExamplesApi.list(),
    enabled: slug.length > 0,
    staleTime: STALE.STATIC,
    // Don't retry on 4xx — fall through to local gallery fallback.
    retry: (failureCount, error) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number'
      ) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 1;
    },
  });
}
