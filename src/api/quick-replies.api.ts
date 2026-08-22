import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import type { QuickReply } from '@/types/api';

const base = (slug: string) => `/v1/workspaces/${slug}/whatsapp/quick-replies`;

export interface CreateQuickReplyBody {
  title: string;
  body: string;
  /** Stored without leading '/'; strip it here too as a safety net. */
  shortcut: string;
}

export interface UpdateQuickReplyBody {
  title?: string;
  body?: string;
  shortcut?: string;
}

function stripSlash(s: string) {
  return s.replace(/^\/+/, '');
}

export const quickRepliesApi = {
  list: (slug: string): Promise<{ quickReplies: QuickReply[] }> =>
    apiGet(base(slug)),

  create: (slug: string, input: CreateQuickReplyBody): Promise<QuickReply> =>
    apiPost(base(slug), {
      ...input,
      shortcut: stripSlash(input.shortcut),
    }),

  update: (
    slug: string,
    id: string,
    input: UpdateQuickReplyBody,
  ): Promise<QuickReply> =>
    apiPatch(`${base(slug)}/${id}`, {
      ...input,
      ...(input.shortcut !== undefined
        ? { shortcut: stripSlash(input.shortcut) }
        : {}),
    }),

  delete: (slug: string, id: string): Promise<void> =>
    apiDelete(`${base(slug)}/${id}`),
};
