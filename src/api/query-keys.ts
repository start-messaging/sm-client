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
    invitePreview: (token: string) => ['invite-preview', token] as const,
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  whatsapp: {
    // WABA connection status — keyed by slug (changes on connect/disconnect).
    status: (slug: string) => ['whatsapp', 'status', slug] as const,
  },

  // ── WhatsApp analytics ────────────────────────────────────────────────────
  analytics: {
    overview: (slug: string) => ['analytics', 'overview', slug] as const,
  },

  // ── Template Examples (admin-curated gallery) ─────────────────────────────
  templateExamples: {
    list: (slug: string) => ['template-examples', slug] as const,
  },

  // ── Templates ─────────────────────────────────────────────────────────────
  templates: {
    all: (slug: string) => ['templates', slug] as const,
    byId: (slug: string, id: string) => ['templates', slug, id] as const,
  },

  // ── Messages / conversations ───────────────────────────────────────────────
  messages: {
    // Prefix for all conversations of a workspace (useful for broad invalidation).
    conversationsAll: (slug: string) =>
      ['messages', 'conversations', slug] as const,
    // Tab + filter-scoped list — both are part of the key so changes fetch fresh.
    // filters is intentionally an object so TanStack deep-compares it.
    conversations: (
      slug: string,
      tab?: string,
      filters?: {
        unread?: boolean;
        assigneeUserId?: string;
        window?: 'open' | 'closed';
        tag?: string;
      } | null,
    ) =>
      [
        'messages',
        'conversations',
        slug,
        tab ?? 'all',
        filters ?? null,
      ] as const,
    list: (slug: string, conversationId: string) =>
      ['messages', 'list', slug, conversationId] as const,
    // Total unread-conversation count — drives the sidebar Inbox badge.
    unreadCount: (slug: string) => ['messages', 'unread-count', slug] as const,
  },

  // ── Contacts ──────────────────────────────────────────────────────────────
  contacts: {
    // search is part of the key so a new term fetches fresh instead of
    // reading a stale cache entry for a different filter.
    all: (slug: string, search?: string) =>
      ['contacts', slug, search ?? null] as const,
    byId: (slug: string, id: string) => ['contacts', slug, id] as const,
    notes: (slug: string, contactId: string) =>
      ['contacts', 'notes', slug, contactId] as const,
  },

  // ── WhatsApp inbox pipeline stages ────────────────────────────────────────
  whatsappInbox: {
    pipelineStages: (slug: string) =>
      ['whatsapp-inbox', 'pipeline-stages', slug] as const,
  },

  // ── Campaigns ─────────────────────────────────────────────────────────────
  campaigns: {
    all: (slug: string) => ['campaigns', slug] as const,
    byId: (slug: string, id: string) => ['campaigns', slug, id] as const,
    analytics: (slug: string, id: string) =>
      ['campaigns', slug, id, 'analytics'] as const,
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  billing: {
    subscription: (slug: string) => ['billing', 'subscription', slug] as const,
    plans: (slug: string) => ['billing', 'plans', slug] as const,
  },
} as const;
