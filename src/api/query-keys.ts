/**
 * Centralized query-key factory. One source of truth for every cache key so:
 *   - invalidation is precise (`queryKeys.members.all(wsId)`), and
 *   - workspace-scoped data is namespaced by workspaceId, so switching workspace
 *     wipes the right slices without touching another workspace's cache.
 *
 * Convention: keys are arrays, broad → narrow. Invalidate a prefix to catch all
 * nested keys.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  services: {
    all: () => ['services'] as const,
  },
  workspaces: {
    // The user's full workspace list — user-scoped, not workspace-scoped.
    all: () => ['workspaces'] as const,
    // The active workspace's detail — scoped by workspaceId so each caches independently.
    current: (workspaceId: string) =>
      ['workspaces', workspaceId, 'current'] as const,
  },
  members: {
    all: (workspaceId: string) => ['members', workspaceId] as const,
  },
} as const;
