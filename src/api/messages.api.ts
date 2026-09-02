import { apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageMediaType =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker';

export type MessageType =
  | 'text'
  | 'media'
  | 'template'
  | 'interactive_button'
  | 'interactive_list'
  | 'interactive_reply';

export interface InteractiveData {
  interactiveType?: 'button_reply' | 'list_reply';
  replyId?: string;
  replyTitle?: string;
  /** Full interactive payload for outbound button/list messages. */
  payload?: Record<string, unknown>;
}

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
  /** Discriminates text / media / template / interactive_* messages. */
  messageType?: MessageType | null;
  /** Structured payload for interactive outbound and inbound reply messages. */
  interactiveData?: InteractiveData | null;
}

export type ConversationTab = 'all' | 'active' | 'mine';
export type ConversationStatus = 'open' | 'resolved';
export type ConversationWindowFilter = 'open' | 'closed';

/** Server-side filters sent as query params to GET /conversations. All optional. */
export interface ConversationFilters {
  /** Only conversations with unread_count > 0. */
  unread?: boolean;
  /** Conversations assigned to this userId. */
  assigneeUserId?: string;
  /** open = last_inbound_at within 24 h; closed = beyond 24 h. */
  window?: ConversationWindowFilter;
  /** Joined contact.tags jsonb contains this string. */
  tag?: string;
}

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
  /**
   * Contact tags (joined from the linked contact). Not yet populated by the
   * list endpoint — the row renders once the server includes it.
   */
  tags?: string[];
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
  /** Public URL for the template header media (IMAGE/VIDEO/DOCUMENT). */
  headerMediaUrl?: string;
  /** Client-only: file uploaded to Meta media, then sent as header id. */
  _headerMediaFile?: File;
  buttonParameters?: Array<{
    index: number;
    subType: 'url' | 'copy_code' | 'flow';
    text?: string;
    couponCode?: string;
  }>;
  /** Client-only: pre-hydrated body for optimistic bubble display. Stripped before API send. */
  _hydratedBody?: string;
  /** Client-only: blob URL or CDN URL for the header media optimistic preview. */
  _headerPreviewUrl?: string;
  /** Client-only: header media type for the optimistic bubble. */
  _headerMediaFormat?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export type SendMessageBody = SendTextMessageBody | SendTemplateMessageBody;

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export interface SendInteractiveButtonBody {
  type: 'button';
  body: string;
  footer?: string;
  buttons: InteractiveButton[];
}

export interface SendInteractiveListBody {
  type: 'list';
  body: string;
  footer?: string;
  buttonLabel: string;
  sections: InteractiveListSection[];
}

export type SendInteractiveMessageBody =
  | SendInteractiveButtonBody
  | SendInteractiveListBody;

export interface CreateConversationBody {
  contactPhone: string;
  contactName?: string;
}

export interface UnreadCountResult {
  total: number;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const messagesApi = {
  listConversations: (
    slug: string,
    tab?: ConversationTab,
    filters?: ConversationFilters,
  ) =>
    apiGet<ConversationListResult>(
      endpoints.messages.conversations(slug, { tab, ...filters }),
    ),

  patchConversation: (slug: string, id: string, body: PatchConversationBody) =>
    apiPatch<WaConversation>(endpoints.messages.patch(slug, id), body),

  createConversation: (slug: string, body: CreateConversationBody) =>
    apiPost<WaConversation>(endpoints.messages.createConversation(slug), body),

  listMessages: (slug: string, conversationId: string) =>
    apiGet<MessageListResult>(endpoints.messages.list(slug, conversationId)),

  getUnreadCount: (slug: string) =>
    apiGet<UnreadCountResult>(endpoints.messages.unreadCount(slug)),

  send: (slug: string, conversationId: string, body: SendMessageBody) => {
    if (body.type === 'template' && body._headerMediaFile) {
      const form = new FormData();
      form.append('type', 'template');
      form.append('templateName', body.templateName);
      form.append('templateLanguage', body.templateLanguage);
      if (body.parameters?.length) form.append('parameters', JSON.stringify(body.parameters));
      if (body.buttonParameters?.length) {
        form.append('buttonParameters', JSON.stringify(body.buttonParameters));
      }
      form.append('headerFile', body._headerMediaFile);
      return apiPost<WaMessage>(endpoints.messages.send(slug, conversationId), form);
    }
    return apiPost<WaMessage>(endpoints.messages.send(slug, conversationId), body);
  },

  sendInteractive: (
    slug: string,
    conversationId: string,
    body: SendInteractiveMessageBody,
  ) =>
    apiPost<WaMessage>(
      endpoints.messages.sendInteractive(slug, conversationId),
      body,
    ),

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
