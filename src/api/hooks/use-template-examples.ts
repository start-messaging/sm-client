import { useQuery } from '@tanstack/react-query';
import { templateExamplesApi } from '@/api/template-examples.api';
import { queryKeys } from '@/api/query-keys';

/** Published template gallery examples — served from the DB via the server API. */
export function useTemplateExamples() {
  return useQuery({
    queryKey: queryKeys.templateExamples.list(),
    queryFn: () => templateExamplesApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}
