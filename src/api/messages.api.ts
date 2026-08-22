import { apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type MessageStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageMediaType =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker';

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
  /** Meta error code when status is failed (from Graph or status webhook). */
  failureCode?: number | null;
  /** Human-readable Meta failure detail when status is failed. */
  failureReason?: string | null;
  /** Media type for image/audio/video/document/sticker messages. */
  mediaType?: MessageMediaType | null;
  /** Public R2 URL for the media file (when R2_PUBLIC_URL is configured). */
  mediaUrl?: string | null;
  /** MIME type of the media file. */
  mediaMime?: string | null;
  /** Original filename (primarily for document messages). */
  mediaFilename?: string | null;
}

export type ConversationTab = 'all' | 'active' | 'mine';
export type ConversationStatus = 'open' | 'resolved';

export interface WaConversation {
  id: string;
  contactId: string | null;
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
  /** Assignment / resolution (Slice 1 additions). */
  assignedToUserId: string | null;
  assigneeName: string | null;
  status: ConversationStatus;
  resolvedAt: string | null;
}

export interface PatchConversationBody {
  assignedToUserId?: string | null;
  status?: ConversationStatus;
  unreadCount?: 0;
  claim?: true;
}

export interface PipelineStage {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
}

export interface PipelineStagesResult {
  pipelineStages: PipelineStage[];
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
  listConversations: (slug: string, tab?: ConversationTab) =>
    apiGet<ConversationListResult>(endpoints.messages.conversations(slug, tab)),

  patchConversation: (slug: string, id: string, body: PatchConversationBody) =>
    apiPatch<WaConversation>(endpoints.messages.patch(slug, id), body),

  createConversation: (slug: string, body: CreateConversationBody) =>
    apiPost<WaConversation>(endpoints.messages.createConversation(slug), body),

  listMessages: (slug: string, conversationId: string) =>
    apiGet<MessageListResult>(endpoints.messages.list(slug, conversationId)),

  send: (slug: string, conversationId: string, body: SendMessageBody) =>
    apiPost<WaMessage>(endpoints.messages.send(slug, conversationId), body),

  /**
   * Upload and send a media message via multipart/form-data.
   * Server handles: R2 storage → Meta Graph upload → send message.
   */
  sendMedia: (
    slug: string,
    conversationId: string,
    file: File,
    caption?: string,
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (caption?.trim()) form.append('caption', caption.trim());
    return apiPost<WaMessage>(
      endpoints.messages.sendMedia(slug, conversationId),
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
