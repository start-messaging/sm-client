import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/types/error';

/**
 * Global cache policy — freshness-first, with redundant requests eliminated for
 * free. Two ideas people conflate, kept separate:
 *
 *   1. "Don't re-fire the same request" → DEDUPLICATION (always on): concurrent
 *      reads of one key share ONE network call; a short `staleTime` skips
 *      refetch-on-mount during rapid navigation.
 *   2. "User must see the latest data" → STALE-WHILE-REVALIDATE: stale data is
 *      shown instantly while a background refetch swaps in fresh data with no
 *      spinner — plus refetch-on-focus / on-reconnect and mutation invalidation.
 *
 * So `staleTime` is NOT "how long the user is stuck with old data" — only how
 * long before an automatic refetch is allowed to trigger. Kept short (30s) so
 * the app feels live; dedup + the backend's own caching keep request volume sane.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (isApiError(error)) {
          // Client errors are deterministic — retrying just wastes requests.
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: false, // mutations are not idempotent — never auto-retry
    },
  },
});

/**
 * Staleness presets for call sites, so intent is explicit and consistent.
 *   STATIC    — reference data that rarely changes (services, plans).
 *   STANDARD  — normal entity lists (members, workspaces); matches the default.
 *   LIVE      — fast-moving data that must feel current; 0 = refetch on every
 *               trigger. Pair with realtime/polling later.
 */
export const STALE = {
  STATIC: 60 * 60 * 1000, // 1 hour
  STANDARD: 30 * 1000, // 30 seconds
  LIVE: 0,
} as const;
