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
    conversationsAll: (slug: string) => ['messages', 'conversations', slug] as const,
    // Tab-scoped list — tab is part of the key so switching tabs fetches fresh.
    conversations: (slug: string, tab?: string) =>
      ['messages', 'conversations', slug, tab ?? 'all'] as const,
    list: (slug: string, conversationId: string) =>
      ['messages', 'list', slug, conversationId] as const,
  },

  // ── Contacts ──────────────────────────────────────────────────────────────
  contacts: {
    all: (slug: string) => ['contacts', slug] as const,
    byId: (slug: string, id: string) => ['contacts', slug, id] as const,
    notes: (slug: string, contactId: string) =>
      ['contacts', 'notes', slug, contactId] as const,
  },

  // ── WhatsApp inbox pipeline stages ────────────────────────────────────────
  whatsappInbox: {
    pipelineStages: (slug: string) => ['whatsapp-inbox', 'pipeline-stages', slug] as const,
  },

  // ── Campaigns ─────────────────────────────────────────────────────────────
  campaigns: {
    all: (slug: string) => ['campaigns', slug] as const,
    byId: (slug: string, id: string) => ['campaigns', slug, id] as const,
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  billing: {
    subscription: (slug: string) => ['billing', 'subscription', slug] as const,
    plans: (slug: string) => ['billing', 'plans', slug] as const,
  },
} as const;
