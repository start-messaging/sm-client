import { useQuery } from '@tanstack/react-query';
import { assignmentEventsApi } from '@/api/assignment-events.api';
import { STALE } from '@/lib/query-client';

/** Inline query keys — do not add to the shared query-keys.ts. */
export const assignmentEventKeys = {
  list: (slug: string, conversationId: string) =>
    ['assignment-events', slug, conversationId] as const,
};

/**
 * Fetch the assignment-event log for a single conversation (newest last).
 *
 * If the server returns 404 (endpoint not yet deployed), fails silently —
 * callers treat `data` as `undefined` and render nothing.
 */
export function useAssignmentEvents(slug: string, conversationId: string) {
  return useQuery({
    queryKey: assignmentEventKeys.list(slug, conversationId),
    queryFn: () => assignmentEventsApi.list(slug, conversationId),
    enabled: slug.length > 0 && conversationId.length > 0,
    staleTime: STALE.LIVE,
    refetchOnWindowFocus: true,
  });
}
