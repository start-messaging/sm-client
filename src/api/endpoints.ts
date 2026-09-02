/**
 * Single source of truth for every backend route this app calls. Change a path
 * (or the API version) here once — never hunt through the `*.api.ts` files.
 *
 * Static paths are plain strings; parameterized ones are functions. Everything
 * is prefixed with the API version via `v1()`, so bumping `/v1` → `/v2` is a
 * one-line edit.
 */
const API_VERSION = 'v1';
const v1 = (path: string) => `/${API_VERSION}${path}`;

export const endpoints = {
  auth: {
    signup: v1('/auth/signup'),
    verifyOtp: v1('/auth/verify-otp'),
    resendOtp: v1('/auth/resend-otp'),
    setMobile: v1('/auth/mobile'),
    verifyMobileOtp: v1('/auth/verify-mobile-otp'),
    login: v1('/auth/login'),
    refresh: v1('/auth/refresh'),
    me: v1('/auth/me'),
    logout: v1('/auth/logout'),
  },
  services: {
    // Services available in the authenticated user's country.
    list: v1('/services'),
    // Service-first creation: a workspace is born under a service.
    createWorkspace: (serviceKey: string) =>
      v1(`/services/${serviceKey}/workspaces`),
  },
  workspaces: {
    // Every workspace the caller belongs to.
    mine: v1('/workspaces'),
    bySlug: (slug: string) => v1(`/workspaces/${slug}`),
    walletBySlug: (slug: string) => v1(`/workspaces/${slug}/wallet`),
  },
  members: {
    list: (slug: string) => v1(`/workspaces/${slug}/members`),
    invitations: (slug: string) =>
      v1(`/workspaces/${slug}/members/invitations`),
    invitation: (slug: string, invId: string) =>
      v1(`/workspaces/${slug}/members/invitations/${invId}`),
    resend: (slug: string, invId: string) =>
      v1(`/workspaces/${slug}/members/invitations/${invId}/resend`),
    role: (slug: string, memberId: string) =>
      v1(`/workspaces/${slug}/members/${memberId}/role`),
    member: (slug: string, memberId: string) =>
      v1(`/workspaces/${slug}/members/${memberId}`),
  },
  // Token-based invite acceptance (outside any workspace context).
  invitations: {
    preview: (token: string) => v1(`/invitations/${token}`),
    accept: (token: string) => v1(`/invitations/${token}/accept`),
    claim: (token: string) => v1(`/invitations/${token}/claim`),
  },
  countries: {
    // Active countries for the onboarding phone picker.
    list: v1('/countries'),
  },

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  whatsapp: {
    // WABA connection status for a workspace.
    status: (slug: string) => v1(`/workspaces/${slug}/whatsapp/status`),
    // Complete Embedded Signup — POST the code returned by the FB SDK.
    connect: (slug: string) => v1(`/workspaces/${slug}/whatsapp/connect`),
    registerPhone: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/register-phone`),
    // Pull connection state from Meta (manual refresh).
    sync: (slug: string) => v1(`/workspaces/${slug}/whatsapp/sync`),
    // Disconnect / revoke WABA.
    disconnect: (slug: string) => v1(`/workspaces/${slug}/whatsapp/disconnect`),
    productCatalogs: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/product-catalogs`),
  },

  // ── WhatsApp analytics ────────────────────────────────────────────────────
  analytics: {
    // Dashboard overview widget: today's counts, avg response, top agents.
    overview: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/analytics/overview`),
    agentStats: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/analytics/agents`),
    messageErrors: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/analytics/message-errors`),
  },

  // ── Template Examples (admin-curated gallery, published only) ────────────
  templateExamples: {
    /** Global published recipes (JWT). Not workspace-scoped on the server. */
    list: () => v1(`/whatsapp/template-examples`),
  },

  // ── Templates ─────────────────────────────────────────────────────────────
  templates: {
    list: (slug: string) => v1(`/workspaces/${slug}/whatsapp/templates`),
    create: (slug: string) => v1(`/workspaces/${slug}/whatsapp/templates`),
    byId: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/templates/${id}`),
    delete: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/templates/${id}`),
    // Sync template statuses from Meta.
    sync: (slug: string) => v1(`/workspaces/${slug}/whatsapp/templates/sync`),
    mediaUpload: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/templates/media-upload`),
    mediaSample: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/templates/media-sample`),
  },

  // ── Messages / Inbox ──────────────────────────────────────────────────────
  messages: {
    // Conversation list (inbox) with optional tab + server-side filters.
    conversations: (
      slug: string,
      params?: {
        tab?: string;
        unread?: boolean;
        assigneeUserId?: string;
        window?: 'open' | 'closed';
        tag?: string;
      },
    ) => {
      const base = v1(`/workspaces/${slug}/whatsapp/conversations`);
      const qs = new URLSearchParams();
      if (params?.tab) qs.set('tab', params.tab);
      if (params?.unread) qs.set('unread', 'true');
      if (params?.assigneeUserId)
        qs.set('assigneeUserId', params.assigneeUserId);
      if (params?.window) qs.set('window', params.window);
      if (params?.tag) qs.set('tag', params.tag);
      const str = qs.toString();
      return str ? `${base}?${str}` : base;
    },
    // PATCH a conversation (assign, resolve, mark-read, claim).
    patch: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/conversations/${id}`),
    // Create or get a conversation by contactPhone.
    createConversation: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/conversations`),
    // Messages within a conversation.
    list: (slug: string, conversationId: string) =>
      v1(
        `/workspaces/${slug}/whatsapp/conversations/${conversationId}/messages`,
      ),
    // Send a message (free-form or template).
    send: (slug: string, conversationId: string) =>
      v1(
        `/workspaces/${slug}/whatsapp/conversations/${conversationId}/messages`,
      ),
    // Upload and send a media message (multipart/form-data).
    sendMedia: (slug: string, conversationId: string) =>
      v1(`/workspaces/${slug}/whatsapp/conversations/${conversationId}/media`),
    // Send an interactive (reply-button or list) message within the 24h window.
    sendInteractive: (slug: string, conversationId: string) =>
      v1(
        `/workspaces/${slug}/whatsapp/conversations/${conversationId}/interactive`,
      ),
    // SSE live inbox updates (pair with ?access_token= for EventSource).
    events: (slug: string) => v1(`/workspaces/${slug}/whatsapp/events`),
    // Count of conversations with unread messages (for the nav badge).
    unreadCount: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/conversations/unread-count`),
  },

  // ── Contacts ──────────────────────────────────────────────────────────────
  contacts: {
    list: (slug: string, params?: { search?: string }) => {
      const base = v1(`/workspaces/${slug}/contacts`);
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      const str = qs.toString();
      return str ? `${base}?${str}` : base;
    },
    create: (slug: string) => v1(`/workspaces/${slug}/contacts`),
    byId: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/contacts/${id}`),
    update: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/contacts/${id}`),
    delete: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/contacts/${id}`),
    import: (slug: string) => v1(`/workspaces/${slug}/contacts/import`),
    notes: (slug: string, contactId: string) =>
      v1(`/workspaces/${slug}/contacts/${contactId}/notes`),
  },

  // ── WhatsApp inbox ops (pipeline stages) ──────────────────────────────────
  whatsappInbox: {
    pipelineStages: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/pipeline-stages`),
  },

  // ── Campaigns ─────────────────────────────────────────────────────────────
  campaigns: {
    list: (slug: string) => v1(`/workspaces/${slug}/whatsapp/campaigns`),
    create: (slug: string) => v1(`/workspaces/${slug}/whatsapp/campaigns`),
    byId: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}`),
    update: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}`),
    delete: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}`),
    launch: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}/launch`),
    pause: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}/pause`),
    resume: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}/resume`),
    duplicate: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}/duplicate`),
    analytics: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}/analytics`),
    audienceCsv: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/${id}/audience-csv`),
    lastMarketingSend: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/campaigns/last-marketing-send`),
  },

  // ── Billing (CRM subscription) ────────────────────────────────────────────
  billing: {
    // Current subscription status.
    subscription: (slug: string) =>
      v1(`/workspaces/${slug}/billing/subscription`),
    // Create / upgrade via Razorpay checkout.
    checkout: (slug: string) => v1(`/workspaces/${slug}/billing/checkout`),
    // Available plans to upgrade to.
    plans: (slug: string) => v1(`/workspaces/${slug}/billing/plans`),
  },

  // ── Auto-reply rules ──────────────────────────────────────────────────────
  autoReplies: {
    list: (slug: string) => v1(`/workspaces/${slug}/whatsapp/auto-reply-rules`),
    create: (slug: string) =>
      v1(`/workspaces/${slug}/whatsapp/auto-reply-rules`),
    byId: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/whatsapp/auto-reply-rules/${id}`),
  },

  // ── FCM web push ──────────────────────────────────────────────────────────
  push: {
    fcmWeb: v1('/me/push/fcm-web'),
    fcmWebStatus: v1('/me/push/fcm-web/status'),
  },

  // ── Flows (no-code chatbot automations) ──────────────────────────────────
  flows: {
    list: (slug: string) => v1(`/workspaces/${slug}/flows`),
    create: (slug: string) => v1(`/workspaces/${slug}/flows`),
    get: (slug: string, id: string) => v1(`/workspaces/${slug}/flows/${id}`),
    patch: (slug: string, id: string) => v1(`/workspaces/${slug}/flows/${id}`),
    delete: (slug: string, id: string) => v1(`/workspaces/${slug}/flows/${id}`),
    activate: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/flows/${id}/activate`),
    deactivate: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/flows/${id}/deactivate`),
    trigger: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/flows/${id}/trigger`),
  },

  // ── Meta Flows (read-only sync from Facebook Business Manager) ───────────
  metaFlows: {
    list: (slug: string) => v1(`/workspaces/${slug}/whatsapp/meta-flows`),
    sync: (slug: string) => v1(`/workspaces/${slug}/whatsapp/meta-flows/sync`),
  },

  // ── API Keys (for Outbound Trigger API) ──────────────────────────────────
  apiKeys: {
    list: (slug: string) => v1(`/workspaces/${slug}/api-keys`),
    create: (slug: string) => v1(`/workspaces/${slug}/api-keys`),
    revoke: (slug: string, id: string) =>
      v1(`/workspaces/${slug}/api-keys/${id}`),
  },
} as const;
