import { useQuery } from '@tanstack/react-query';
import { templateExamplesApi, type TemplateExample } from '@/api/template-examples.api';
import { queryKeys } from '@/api/query-keys';

/** Published template gallery examples — served from the DB via the server API. */
export function useTemplateExamples() {
  return useQuery({
    queryKey: queryKeys.templateExamples.list(),
    queryFn: () => templateExamplesApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Convenience wrapper that returns the resolved array directly (empty while
 * loading) so callers don't have to destructure `data`.
 * The `_slug` param is unused at runtime but kept so existing call-sites that
 * pass `ws.slug` don't need changing.
 */
export function useResolvedTemplateExamples(_slug?: string): TemplateExample[] {
  const { data } = useTemplateExamples();
  return data ?? [];
}
