import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type MessageStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type MessageDirection = 'inbound' | 'outbound';

export interface WaMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  status: MessageStatus;
  /** Plain text body (template messages may have structured body). */
  body: string | null;
  /** ISO timestamp from Meta or our webhook. */
  timestamp: string;
  /** When this is an outbound template message, the template name used. */
  templateName: string | null;
}

export interface WaConversation {
  id: string;
  contactName: string | null;
  contactPhone: string;
  /**
   * ISO timestamp of the customer's last inbound message.
   * Used by the UI to warn when the 24h window is closing / has closed.
   */
  lastInboundAt: string | null;
  lastMessage: WaMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationListResult {
  conversations: WaConversation[];
  total: number;
}

export interface MessageListResult {
  messages: WaMessage[];
  total: number;
}

export interface SendTextMessageBody {
  type: 'text';
  text: string;
}

export interface SendTemplateMessageBody {
  type: 'template';
  templateName: string;
  templateLanguage: string;
  /** Parameter values for dynamic template components. */
  parameters?: Record<string, string>[];
}

export type SendMessageBody = SendTextMessageBody | SendTemplateMessageBody;

export interface CreateConversationBody {
  contactPhone: string;
  contactName?: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const messagesApi = {
  listConversations: (slug: string) =>
    apiGet<ConversationListResult>(endpoints.messages.conversations(slug)),

  createConversation: (slug: string, body: CreateConversationBody) =>
    apiPost<WaConversation>(endpoints.messages.createConversation(slug), body),

  listMessages: (slug: string, conversationId: string) =>
    apiGet<MessageListResult>(endpoints.messages.list(slug, conversationId)),

  send: (slug: string, conversationId: string, body: SendMessageBody) =>
    apiPost<WaMessage>(endpoints.messages.send(slug, conversationId), body),
};
