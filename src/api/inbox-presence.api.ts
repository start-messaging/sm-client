import { apiGet, apiPost } from '@/lib/http';

const v1 = (path: string) => `/v1${path}`;

// ── Types ──────────────────────────────────────────────────────────────────

export interface PresenceViewer {
  userId: string;
  fullName: string;
}

export interface PresenceResult {
  viewers: PresenceViewer[];
}

// ── API calls ──────────────────────────────────────────────────────────────

export const inboxPresenceApi = {
  /**
   * Refresh the current user's presence TTL for this conversation.
   * POST — no request body; server reads the caller from the JWT.
   */
  heartbeat: (slug: string, conversationId: string) =>
    apiPost<void>(
      v1(
        `/workspaces/${slug}/whatsapp/conversations/${conversationId}/presence`,
      ),
    ),

  /**
   * Return all active viewers for this conversation.
   * Client should exclude the current user (server returns everyone including caller).
   */
  getViewers: (slug: string, conversationId: string) =>
    apiGet<PresenceResult>(
      v1(
        `/workspaces/${slug}/whatsapp/conversations/${conversationId}/presence`,
      ),
    ),
};
