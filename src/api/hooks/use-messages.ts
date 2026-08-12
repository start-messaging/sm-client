import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  messagesApi,
  type CreateConversationBody,
  type SendMessageBody,
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
  opts?: { sseConnected?: boolean },
) {
  const sseConnected = opts?.sseConnected ?? false;
  return useQuery({
    queryKey: queryKeys.messages.conversations(slug),
    queryFn: () => messagesApi.listConversations(slug),
    enabled: slug.length > 0,
    staleTime: STALE.LIVE,
    refetchInterval: (query) =>
      query.state.status === 'success' ? shouldPollInbox(sseConnected) : false,
    refetchIntervalInBackground: false,
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

/** Send a message (free-form text or template). */
export function useSendMessage(slug: string, conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageBody) =>
      messagesApi.send(slug, conversationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.list(slug, conversationId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.conversations(slug),
      });
    },
  });
}

/** Create-or-get a conversation by contactPhone. */
export function useCreateConversation(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConversationBody) =>
      messagesApi.createConversation(slug, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.messages.conversations(slug),
      });
    },
  });
}
