import { apiGet, apiPatch } from '@/lib/http';

const base = (slug: string) => `/v1/workspaces/${slug}/whatsapp/inbox-settings`;

export interface InboxSettings {
  id: string;
  workspaceId: string;
  roundRobinEnabled: boolean;
  /** The calling user's own availability flag. */
  inboxAvailable: boolean;
  lastRoutedUserId: string | null;
}

export interface PatchInboxSettingsBody {
  /** ADMIN+ only. Enables/disables workspace-wide round-robin routing. */
  roundRobinEnabled?: boolean;
  /** AGENT+. Marks the caller available or unavailable for new chat assignments. */
  inboxAvailable?: boolean;
}

export const inboxSettingsApi = {
  get: (slug: string): Promise<InboxSettings> => apiGet(base(slug)),

  patch: (slug: string, body: PatchInboxSettingsBody): Promise<InboxSettings> =>
    apiPatch(base(slug), body),
};
