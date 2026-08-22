import { useQuery } from '@tanstack/react-query';
import { templateExamplesApi } from '@/api/template-examples.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import {
  TEMPLATE_EXAMPLES,
  type TemplateExample,
} from '@/lib/template-examples';

/**
 * Fetches admin-published template examples for the gallery.
 * On error the hook returns isError=true; callers fall back to TEMPLATE_EXAMPLES.
 */
export function useTemplateExamples(slug: string) {
  return useQuery({
    queryKey: queryKeys.templateExamples.list(slug),
    queryFn: () => templateExamplesApi.list(),
    enabled: slug.length > 0,
    staleTime: STALE.STATIC,
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

/** Admin-curated list when present; otherwise the local recipe pack. */
export function useResolvedTemplateExamples(slug: string): TemplateExample[] {
  const { data, isError } = useTemplateExamples(slug);
  if (!isError && data && data.length > 0) return data;
  return TEMPLATE_EXAMPLES;
}
