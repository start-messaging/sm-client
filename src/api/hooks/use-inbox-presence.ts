import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  inboxPresenceApi,
  type PresenceViewer,
} from '@/api/inbox-presence.api';
import { useAuthStore } from '@/stores/auth.store';

const HEARTBEAT_MS = 20_000;
const POLL_MS = 10_000;

/** Inline query keys — do not add to the shared query-keys.ts. */
export const inboxPresenceKeys = {
  viewers: (slug: string, conversationId: string) =>
    ['inbox-presence', slug, conversationId] as const,
};

/**
 * While the component is mounted:
 *   - POST a heartbeat to refresh the current user's presence TTL every ~20 s.
 *   - GET the viewer list every ~10 s and return all viewers except the current user.
 *
 * If the server returns 404 (presence endpoint not yet deployed), fails silently
 * and returns an empty viewers array.
 */
export function useInboxPresence(
  slug: string,
  conversationId: string,
): { viewers: PresenceViewer[] } {
  const userId = useAuthStore((s) => s.user?.id);

  // ── Heartbeat ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug || !conversationId) return;

    // Fire immediately on mount, then on the interval.
    void inboxPresenceApi
      .heartbeat(slug, conversationId)
      .catch(() => undefined);

    const timer = setInterval(() => {
      void inboxPresenceApi
        .heartbeat(slug, conversationId)
        .catch(() => undefined);
    }, HEARTBEAT_MS);

    return () => clearInterval(timer);
  }, [slug, conversationId]);

  // ── Viewer poll ──────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: inboxPresenceKeys.viewers(slug, conversationId),
    queryFn: () => inboxPresenceApi.getViewers(slug, conversationId),
    enabled: slug.length > 0 && conversationId.length > 0,
    staleTime: 0,
    refetchInterval: () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return false;
      }
      return POLL_MS;
    },
    refetchIntervalInBackground: false,
  });

  // Exclude the current user from the chip (soft info, not a lock).
  const viewers: PresenceViewer[] = (query.data?.viewers ?? []).filter(
    (v) => v.userId !== userId,
  );

  return { viewers };
}
