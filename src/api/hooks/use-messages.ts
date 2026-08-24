import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  messagesApi,
  type ConversationFilters,
  type ConversationTab,
  type CreateConversationBody,
  type MessageListResult,
  type MessageMediaType,
  type PatchConversationBody,
  type SendMessageBody,
  type WaMessage,
} from '@/api/messages.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

/** Fallback poll when SSE is down; slow safety net when SSE is connected. */
const INBOX_POLL_MS = 15_000;
const INBOX_POLL_SSE_CONNECTED_MS = 60_000;

function shouldPollInbox(sseConnected: boolean): number | false {
  if (
    typeof document === 'undefined' ||
    document.visibilityState !== 'visible'
  ) {
    return false;
  }
  // Don't fight the keyboard — pause poll while a modal is open.
  if (document.querySelector('[data-slot="dialog-content"]')) {
    return false;
  }
  return sseConnected ? INBOX_POLL_SSE_CONNECTED_MS : INBOX_POLL_MS;
}

/** Conversation list (inbox) — SSE primary, light poll as fallback. */
export function useConversations(
  slug: string,
  opts?: {
    sseConnected?: boolean;
    tab?: ConversationTab;
    filters?: ConversationFilters;
  },
) {
  const sseConnected = opts?.sseConnected ?? false;
  const tab = opts?.tab ?? 'all';
  const filters = opts?.filters ?? null;
  // Normalise so undefined fields don't create cache-key drift.
  const normalisedFilters =
    filters &&
    Object.values(filters).some(
      (v) => v !== undefined && v !== false && v !== '',
    )
      ? filters
      : null;
  return useQuery({
    queryKey: queryKeys.messages.conversations(slug, tab, normalisedFilters),
    queryFn: () =>
      messagesApi.listConversations(slug, tab, normalisedFilters ?? undefined),
    enabled: slug.length > 0,
    staleTime: STALE.LIVE,
    refetchInterval: (query) =>
      query.state.status === 'success' ? shouldPollInbox(sseConnected) : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Total unread-conversation count, for the sidebar Inbox badge. Polls every
 * 30s as a floor and is invalidated by `useInboxRealtime`'s `inbox.updated`
 * handler, so it stays current without a second SSE connection.
 */
export function useUnreadCount(slug: string, opts?: { enabled?: boolean }) {
  const enabled = (opts?.enabled ?? true) && slug.length > 0;
  return useQuery({
    queryKey: queryKeys.messages.unreadCount(slug),
    queryFn: () => messagesApi.getUnreadCount(slug),
    enabled,
    staleTime: STALE.STANDARD,
    refetchInterval: enabled ? 30_000 : false,
  });
}

/** PATCH a conversation (assign, resolve, mark-read, claim). */
export function usePatchConversation(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchConversationBody }) =>
      messagesApi.patchConversation(slug, id, body),
    onSuccess: () => {
      // Invalidate all tab variants for this workspace's conversation list.
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.conversationsAll(slug),
      });
    },
  });
}

/** Messages within a single conversation — SSE invalidates; poll is fallback. */
export function useMessages(
  slug: string,
  conversationId: string,
  opts?: { sseConnected?: boolean },
) {
  const sseConnected = opts?.sseConnected ?? false;
  return useQuery({
    queryKey: queryKeys.messages.list(slug, conversationId),
    queryFn: () => messagesApi.listMessages(slug, conversationId),
    enabled: slug.length > 0 && conversationId.length > 0,
    staleTime: STALE.LIVE,
    refetchInterval: (query) =>
      query.state.status === 'success' ? shouldPollInbox(sseConnected) : false,
    refetchIntervalInBackground: false,
  });
}

/** Send a message (free-form text or template) with optimistic bubble. */
export function useSendMessage(slug: string, conversationId: string) {
  const qc = useQueryClient();
  const listKey = queryKeys.messages.list(slug, conversationId);

  return useMutation({
    mutationFn: (body: SendMessageBody) =>
      messagesApi.send(slug, conversationId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<MessageListResult>(listKey);

      const optimistic: WaMessage = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        direction: 'outbound',
        status: 'queued',
        body: body.type === 'text' ? body.text : null,
        templateName: body.type === 'template' ? body.templateName : null,
        timestamp: new Date().toISOString(),
        failureCode: null,
        failureReason: null,
      };

      qc.setQueryData<MessageListResult>(listKey, (old) => {
        const messages = old?.messages ?? [];
        return {
          messages: [...messages, optimistic],
          total: (old?.total ?? 0) + 1,
        };
      });

      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(listKey, ctx.previous);
      } else if (ctx?.optimisticId) {
        qc.setQueryData<MessageListResult>(listKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.filter((m) => m.id !== ctx.optimisticId),
            total: Math.max(0, old.total - 1),
          };
        });
      }
    },
    onSuccess: (saved, _body, ctx) => {
      qc.setQueryData<MessageListResult>(listKey, (old) => {
        if (!old) {
          return { messages: [saved], total: 1 };
        }
        const withoutOptimistic = old.messages.filter(
          (m) => m.id !== ctx?.optimisticId,
        );
        // Avoid duplicate if SSE already inserted the real row.
        if (withoutOptimistic.some((m) => m.id === saved.id)) {
          return { ...old, messages: withoutOptimistic };
        }
        return {
          messages: [...withoutOptimistic, saved],
          total: withoutOptimistic.length + 1,
        };
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.conversationsAll(slug),
      });
    },
  });
}

/** Upload + send a media file (image / audio / video / document). */
export function useSendMedia(slug: string, conversationId: string) {
  const qc = useQueryClient();
  const listKey = queryKeys.messages.list(slug, conversationId);

  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      messagesApi.sendMedia(slug, conversationId, file, caption),
    onMutate: async ({ file }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<MessageListResult>(listKey);

      const optimistic: WaMessage = {
        id: `optimistic-media-${Date.now()}`,
        conversationId,
        direction: 'outbound',
        status: 'queued',
        body: null,
        templateName: null,
        timestamp: new Date().toISOString(),
        failureCode: null,
        failureReason: null,
        mediaType: resolveOptimisticMediaType(file.type),
        mediaUrl: URL.createObjectURL(file),
        mediaMime: file.type,
        mediaFilename: file.name,
      };

      qc.setQueryData<MessageListResult>(listKey, (old) => ({
        messages: [...(old?.messages ?? []), optimistic],
        total: (old?.total ?? 0) + 1,
      }));

      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(listKey, ctx.previous);
      } else if (ctx?.optimisticId) {
        qc.setQueryData<MessageListResult>(listKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.filter((m) => m.id !== ctx.optimisticId),
            total: Math.max(0, old.total - 1),
          };
        });
      }
    },
    onSuccess: (saved, _vars, ctx) => {
      qc.setQueryData<MessageListResult>(listKey, (old) => {
        if (!old) return { messages: [saved], total: 1 };
        const withoutOptimistic = old.messages.filter(
          (m) => m.id !== ctx?.optimisticId,
        );
        if (withoutOptimistic.some((m) => m.id === saved.id)) {
          return { ...old, messages: withoutOptimistic };
        }
        return {
          messages: [...withoutOptimistic, saved],
          total: withoutOptimistic.length + 1,
        };
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.conversationsAll(slug),
      });
    },
  });
}

function resolveOptimisticMediaType(mime: string): MessageMediaType {
  const lower = mime.toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('audio/')) return 'audio';
  if (lower.startsWith('video/')) return 'video';
  return 'document';
}

/** Create-or-get a conversation by contactPhone. */
export function useCreateConversation(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConversationBody) =>
      messagesApi.createConversation(slug, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.conversationsAll(slug),
      });
    },
  });
}
