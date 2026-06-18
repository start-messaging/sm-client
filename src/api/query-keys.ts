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
    // Country-scoped: a different country is a different result set, and a
    // user whose country changes never sees another country's stale list.
    byCountry: (countryCode: string) => ['services', countryCode] as const,
  },
  countries: {
    // Active-only picker options (onboarding mobile step).
    options: () => ['countries', 'options'] as const,
  },
  workspaces: {
    // Prefix for everything workspace-related (invalidate after create).
    all: () => ['workspaces'] as const,
    // The user's full workspace list — user-scoped, not workspace-scoped.
    mine: () => ['workspaces', 'mine'] as const,
    // One workspace's shell context, keyed by the URL slug.
    bySlug: (slug: string) => ['workspaces', 'slug', slug] as const,
    // The workspace's wallet balance, keyed by slug.
    wallet: (slug: string) => ['workspaces', 'slug', slug, 'wallet'] as const,
  },
  members: {
    all: (workspaceId: string) => ['members', workspaceId] as const,
  },
} as const;
