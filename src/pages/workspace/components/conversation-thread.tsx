import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Send,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  UserPlus,
  Paperclip,
  FileText,
  Music,
  X,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageDeliveryStatus } from '@/components/inbox/message-delivery-status';
import {
  useMessages,
  useSendMessage,
  useSendMedia,
  usePatchConversation,
} from '@/api/hooks/use-messages';
import { useTemplates } from '@/api/hooks/use-templates';
import { useMembers } from '@/api/hooks/use-members';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast';
import { ROLE_RANK } from '@/types/api';
import type { WaConversation, WaMessage } from '@/api/messages.api';
import type { WorkspaceRole } from '@/types/api';
import { cn } from '@/lib/utils';
import { QuickReplyTypeahead } from '@/components/inbox/quick-reply-typeahead';
import { useInboxPresence } from '@/api/hooks/use-inbox-presence';
import type { PresenceViewer } from '@/api/inbox-presence.api';
import {
  assignmentEventKeys,
  useAssignmentEvents,
} from '@/api/hooks/use-assignment-events';
import {
  toAssignmentEventView,
  type WaAssignmentEvent,
} from '@/api/assignment-events.api';
import { useQueryClient } from '@tanstack/react-query';

// ── Role helpers ─────────────────────────────────────────────────────────────

function atLeast(role: WorkspaceRole | null, min: WorkspaceRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

// ── 24h window helpers ────────────────────────────────────────────────────────

function windowMs(lastInboundAt: string | null): number {
  if (!lastInboundAt) return 0;
  const elapsed = Date.now() - new Date(lastInboundAt).getTime();
  return Math.max(0, 24 * 60 * 60 * 1000 - elapsed);
}

function isWindowOpen(lastInboundAt: string | null): boolean {
  return windowMs(lastInboundAt) > 0;
}

function formatRemaining(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / 60_000);
  return `${String(h)}h ${String(m)}m`;
}

/** Message ids we just sent — toast once if Meta later marks them failed. */
const recentOutboundIds = new Set<string>();
const toastedFailureIds = new Set<string>();

function trackOutbound(id: string) {
  recentOutboundIds.add(id);
  window.setTimeout(() => recentOutboundIds.delete(id), 120_000);
}

// ── Media bubble ─────────────────────────────────────────────────────────────

function MediaBubble({ msg }: { msg: WaMessage }) {
  const outbound = msg.direction === 'outbound';
  const url = msg.mediaUrl ?? undefined;
  const alt = msg.mediaFilename ?? msg.mediaType ?? 'media';
  const mime = msg.mediaMime ?? '';

  if (msg.mediaType === 'image' || msg.mediaType === 'sticker') {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={alt}
          className={cn(
            'max-w-[220px] rounded-lg object-cover',
            outbound ? 'self-end' : 'self-start',
          )}
          loading="lazy"
        />
      </a>
    ) : (
      <span className="italic text-xs text-muted-foreground">
        [{msg.mediaType}]
      </span>
    );
  }

  if (msg.mediaType === 'video') {
    return url ? (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={url}
        controls
        className="max-w-[260px] rounded-lg"
        preload="metadata"
      />
    ) : (
      <span className="italic text-xs text-muted-foreground">[video]</span>
    );
  }

  if (msg.mediaType === 'audio') {
    return url ? (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio src={url} controls className="max-w-[260px]" preload="metadata" />
    ) : (
      <span className="flex items-center gap-1 italic text-xs text-muted-foreground">
        <Music className="size-3" /> [audio]
      </span>
    );
  }

  if (msg.mediaType === 'document') {
    const filename = msg.mediaFilename ?? 'Document';
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded border bg-white/60 dark:bg-white/10 px-3 py-2 text-sm hover:underline"
      >
        <FileText className="size-4 shrink-0" />
        <span className="max-w-[180px] truncate">{filename}</span>
      </a>
    ) : (
      <span className="flex items-center gap-1 italic text-xs text-muted-foreground">
        <FileText className="size-3" /> {filename}
      </span>
    );
  }

  if (mime) {
    return (
      <span className="italic text-xs text-muted-foreground">
        [{mime.split('/')[1] ?? 'file'}]
      </span>
    );
  }

  return null;
}

// ── Text composer ─────────────────────────────────────────────────────────────

const textSchema = z.object({
  text: z.string().min(1).max(4096),
});
type TextForm = z.infer<typeof textSchema>;

/** Accepted MIME types for the file picker — mirrors Meta's allowed types. */
const ACCEPTED_MEDIA_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,' +
  'audio/ogg,audio/mpeg,audio/mp4,audio/aac,' +
  'video/mp4,video/3gpp,' +
  'application/pdf,' +
  'application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'text/plain';

function TextComposer({
  slug,
  conversationId,
  canAttach,
}: {
  slug: string;
  conversationId: string;
  /** false when the caller is VIEWER or outside 24h window */
  canAttach: boolean;
}) {
  const { t } = useTranslation();
  const send = useSendMessage(slug, conversationId);
  const sendMedia = useSendMedia(slug, conversationId);
  const { handleSubmit, reset, formState, watch, setValue } = useForm<TextForm>(
    {
      resolver: zodResolver(textSchema),
      defaultValues: { text: '' },
    },
  );
  const text = watch('text');

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (v: TextForm) =>
    send.mutate(
      { type: 'text', text: v.text },
      {
        onSuccess: (msg) => {
          trackOutbound(msg.id);
          reset();
        },
        onError: (err) => {
          const code = (err as { code?: string }).code;
          if (
            code === 'MESSAGE_WINDOW_CLOSED' ||
            code === 'OUTSIDE_CUSTOMER_CARE_WINDOW'
          ) {
            toast.error(t('errors.MESSAGE_WINDOW_CLOSED'));
          } else {
            toast.error(err);
          }
        },
      },
    );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setCaption('');
    }
    // Reset input so the same file can be re-selected.
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearPendingFile() {
    setPendingFile(null);
    setCaption('');
  }

  function handleSendMedia() {
    if (!pendingFile) return;
    sendMedia.mutate(
      { file: pendingFile, caption: caption.trim() || undefined },
      {
        onSuccess: (msg) => {
          trackOutbound(msg.id);
          clearPendingFile();
        },
        onError: (err) => toast.error(err),
      },
    );
  }

  const isBusy = send.isPending || sendMedia.isPending;

  // File pending: show preview + caption + send controls instead of text area.
  if (pendingFile) {
    return (
      <div className="flex flex-col gap-2 border-t p-3">
        <div className="flex items-center gap-2 rounded border bg-muted/40 px-3 py-2 text-sm">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{pendingFile.name}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={clearPendingFile}
            disabled={isBusy}
          >
            <X className="size-3" />
          </Button>
        </div>
        {!pendingFile.type.startsWith('audio/') && (
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('inbox.composer.captionPlaceholder')}
            className="h-8 text-sm"
            disabled={isBusy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMedia();
              }
            }}
          />
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSendMedia} disabled={isBusy}>
            {isBusy ? (
              <Spinner className="mr-2" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            {t('inbox.composer.sendFile')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-2 px-3 py-3"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MEDIA_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />

      <QuickReplyTypeahead
        slug={slug}
        value={text}
        onChange={(v) =>
          setValue('text', v, { shouldDirty: true, shouldValidate: true })
        }
        placeholder={t('inbox.composer.textPlaceholder')}
        className="min-h-[60px] max-h-40 resize-none flex-1 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#a1a1aa]"
        disabled={isBusy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(onSubmit)();
          }
        }}
      />

      <div className="flex items-center justify-between">
        {canAttach ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 text-[#71717a] hover:text-[#18181b]"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('inbox.composer.attachFile')}
              >
                <Paperclip className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('inbox.composer.attachFile')}</TooltipContent>
          </Tooltip>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isBusy || !formState.isDirty}
          className="bg-[#18181b] text-white hover:bg-[#27272a] text-[12px] font-medium px-[14px] py-[6px] h-auto rounded-[6px]"
        >
          {send.isPending ? (
            <Spinner className="mr-1.5" />
          ) : (
            <Send className="size-3.5 mr-1.5" />
          )}
          {t('inbox.composer.send')}
        </Button>
      </div>
    </form>
  );
}

// ── Template composer ─────────────────────────────────────────────────────────

function bodyPlaceholders(tpl: {
  components: Array<{ type: string; text?: string }>;
}): number[] {
  const body = tpl.components.find((c) => c.type === 'BODY');
  if (!body?.text) return [];
  const found = new Set<number>();
  for (const m of body.text.matchAll(/\{\{(\d+)\}\}/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) found.add(n);
  }
  return [...found].sort((a, b) => a - b);
}

function TemplateComposer({
  slug,
  conversationId,
}: {
  slug: string;
  conversationId: string;
}) {
  const { t } = useTranslation();
  const send = useSendMessage(slug, conversationId);
  const { data } = useTemplates(slug);

  const approvedTemplates = (data?.templates ?? []).filter(
    (tpl) => tpl.status === 'APPROVED',
  );

  const [selectedId, setSelectedId] = useState('');
  const [paramValues, setParamValues] = useState<Record<number, string>>({});

  const selected = approvedTemplates.find((tpl) => tpl.id === selectedId);
  const placeholders = selected ? bodyPlaceholders(selected) : [];

  function handleSelect(id: string) {
    setSelectedId(id);
    setParamValues({});
  }

  function handleSend() {
    if (!selected) return;
    for (const n of placeholders) {
      if (!paramValues[n]?.trim()) {
        toast.error(t('inbox.composer.paramRequired', { n }));
        return;
      }
    }
    send.mutate(
      {
        type: 'template',
        templateName: selected.name,
        templateLanguage: selected.language,
        ...(placeholders.length
          ? {
              parameters: placeholders.map((n) => ({
                text: paramValues[n]!.trim(),
              })),
            }
          : {}),
      },
      {
        onSuccess: (msg) => {
          trackOutbound(msg.id);
          toast.success(t('inbox.composer.sentTemplate'));
          setSelectedId('');
          setParamValues({});
        },
        onError: (err) => toast.error(err),
      },
    );
  }

  if (approvedTemplates.length === 0) {
    return (
      <div className="border-t p-3 text-sm text-muted-foreground">
        {t('inbox.composer.noApprovedTemplates')}
      </div>
    );
  }

  const canSend =
    !!selected &&
    placeholders.every((n) => !!paramValues[n]?.trim()) &&
    !send.isPending;

  return (
    <div className="border-t p-3 flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('inbox.composer.pickTemplate')} />
          </SelectTrigger>
          <SelectContent>
            {approvedTemplates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                <span className="font-mono text-sm">{tpl.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {tpl.language}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!canSend} onClick={handleSend}>
          {send.isPending && <Spinner />}
          {t('inbox.composer.sendTemplate')}
        </Button>
      </div>

      {selected && placeholders.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">
            {t('inbox.composer.paramsHint')}
          </p>
          {placeholders.map((n) => (
            <Input
              key={n}
              value={paramValues[n] ?? ''}
              onChange={(e) =>
                setParamValues((prev) => ({ ...prev, [n]: e.target.value }))
              }
              placeholder={t('inbox.composer.paramPlaceholder', { n })}
              className="h-8 text-sm"
            />
          ))}
        </div>
      )}

      {selected && (
        <p className="text-muted-foreground text-xs line-clamp-3">
          {selected.components.find((c) => c.type === 'BODY')?.text ?? ''}
        </p>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  templateBodyMap,
}: {
  msg: WaMessage;
  templateBodyMap: Record<string, string>;
}) {
  const { t } = useTranslation();
  const outbound = msg.direction === 'outbound';
  const failed = outbound && msg.status === 'failed';
  const isMedia = !!msg.mediaType;

  const resolvedBody =
    msg.body ??
    (msg.templateName ? (templateBodyMap[msg.templateName] ?? null) : null);

  return (
    <div
      className={cn(
        'max-w-[75%] px-3 py-2 text-sm',
        outbound
          ? 'self-end bg-[#18181b] text-white rounded-[10px_0_10px_10px]'
          : 'self-start bg-white border border-[#e4e4e7] rounded-[0_10px_10px_10px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        failed && 'bg-red-100 border-red-200',
      )}
    >
      {msg.templateName && (
        <p
          className={cn(
            'mb-1 text-[11px]',
            outbound ? 'text-[#a1a1aa]' : 'text-muted-foreground',
          )}
        >
          {t('inbox.templateBubble.label', { name: msg.templateName })}
        </p>
      )}

      {/* Media attachment */}
      {isMedia && (
        <div className="mb-1">
          <MediaBubble msg={msg} />
        </div>
      )}

      {/* Text body / caption */}
      {resolvedBody && (
        <p className="whitespace-pre-wrap wrap-break-word">{resolvedBody}</p>
      )}
      {!resolvedBody && !isMedia && (
        <p className="whitespace-pre-wrap wrap-break-word">
          {msg.templateName ? t('inbox.templateBubble.bodyFallback') : '—'}
        </p>
      )}

      {failed && msg.failureReason && (
        <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 leading-snug">
          {msg.failureReason}
        </p>
      )}
      <div className="mt-1 flex items-center justify-end gap-1">
        <span className={cn('text-[11px]', outbound ? 'text-[#a1a1aa]' : 'text-[#a1a1aa]')}>
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {outbound && (
          <MessageDeliveryStatus
            status={msg.status}
            failureReason={msg.failureReason}
          />
        )}
      </div>
    </div>
  );
}

// ── System event line (assignment / resolve / reopen) ────────────────────────

/**
 * Centered transcript line for assignment-event interleaving.
 * Uses i18n keys inbox.events.{kind} (added by agent C).
 */
function SystemEventLine({ event }: { event: WaAssignmentEvent }) {
  const { t } = useTranslation();
  const name =
    event.kind === 'assigned'
      ? (event.targetName ?? event.actorName)
      : event.actorName;
  const label = t(`inbox.events.${event.kind}`, {
    name: name ?? '',
    prev: event.prevName ?? '',
  });
  const time = new Date(event.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="flex items-center justify-center py-1.5 select-none">
      <span className="text-[11px] text-muted-foreground bg-black/5 dark:bg-white/10 rounded-full px-3 py-0.5">
        {label}
        <span className="ml-1.5 opacity-60">{time}</span>
      </span>
    </div>
  );
}

// ── Thread header ─────────────────────────────────────────────────────────────

function ThreadHeader({
  slug,
  workspaceId,
  conversation,
  viewers = [],
}: {
  slug: string;
  workspaceId: string;
  conversation: WaConversation;
  viewers?: PresenceViewer[];
}) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.activeWorkspaceRole);
  const userId = useAuthStore((s) => s.user?.id);
  const patch = usePatchConversation(slug);
  const qc = useQueryClient();
  const { data: rosterData } = useMembers(slug, workspaceId);

  const members = (rosterData?.members ?? []).filter(
    (m) => m.status === 'active',
  );

  const windowOpen = isWindowOpen(conversation.lastInboundAt);
  const remaining = windowMs(conversation.lastInboundAt);
  const closingSoon = windowOpen && remaining < 60 * 60 * 1000;

  const isResolved = conversation.status === 'resolved';
  const isUnassigned = !conversation.assignedToUserId;
  const isMyChat = conversation.assignedToUserId === userId;

  // MANAGER+ can resolve/assign; AGENT can resolve only own chat + claim
  const canResolve =
    atLeast(role, 'MANAGER') || (atLeast(role, 'AGENT') && isMyChat);
  const canAssign = atLeast(role, 'MANAGER');
  const canClaim =
    atLeast(role, 'AGENT') && isUnassigned && !atLeast(role, 'MANAGER');

  const refreshEvents = useCallback(() => {
    void qc.invalidateQueries({
      queryKey: assignmentEventKeys.list(slug, conversation.id),
    });
  }, [qc, slug, conversation.id]);

  const handleResolve = useCallback(() => {
    patch.mutate(
      {
        id: conversation.id,
        body: { status: isResolved ? 'open' : 'resolved' },
      },
      {
        onSuccess: () => {
          refreshEvents();
          toast.success(
            t(
              isResolved
                ? 'inbox.thread.reopenSuccess'
                : 'inbox.thread.resolveSuccess',
            ),
          );
        },
        onError: (err) => toast.error(err),
      },
    );
  }, [conversation.id, isResolved, patch, t, refreshEvents]);

  // ── `e` keyboard shortcut: toggle resolve / reopen ──────────────────────
  const handleResolveRef = useRef(handleResolve);
  useEffect(() => {
    handleResolveRef.current = handleResolve;
  }, [handleResolve]);

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key !== 'e') return;
      const target = ev.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      if (!canResolve) return;
      handleResolveRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canResolve]);

  function handleClaim() {
    patch.mutate(
      { id: conversation.id, body: { claim: true } },
      {
        onSuccess: () => {
          refreshEvents();
          toast.success(t('inbox.thread.claimSuccess'));
        },
        onError: (err) => toast.error(err),
      },
    );
  }

  function handleAssign(memberId: string) {
    if (memberId === '__unassign__') {
      patch.mutate(
        { id: conversation.id, body: { assignedToUserId: null } },
        {
          onSuccess: () => {
            refreshEvents();
            toast.success(
              t('inbox.thread.assignSuccess', { name: t('inbox.unassigned') }),
            );
          },
          onError: (err) => toast.error(err),
        },
      );
      return;
    }
    const member = members.find((m) => m.userId === memberId);
    patch.mutate(
      { id: conversation.id, body: { assignedToUserId: memberId } },
      {
        onSuccess: () => {
          refreshEvents();
          toast.success(
            t('inbox.thread.assignSuccess', {
              name: member?.fullName ?? memberId,
            }),
          );
        },
        onError: (err) => toast.error(err),
      },
    );
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
      {/* Contact info */}
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">
          {conversation.contactName ?? conversation.contactPhone}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-muted-foreground text-xs">
            {conversation.contactPhone}
          </p>
          {conversation.assigneeName && (
            <>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">
                {conversation.assigneeName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Presence chip — soft warning, not a lock */}
        {viewers.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="text-xs cursor-default gap-1"
              >
                <Eye className="size-3" />
                {viewers.length === 1
                  ? t('inbox.presence.viewing', { name: viewers[0]!.fullName })
                  : t('inbox.presence.others', {
                      name: viewers[0]!.fullName,
                      count: viewers.length - 1,
                    })}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {viewers.map((v) => v.fullName).join(', ')}
            </TooltipContent>
          </Tooltip>
        )}
        {/* 24h window badge */}
        {windowOpen ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'text-[11px] font-medium px-[9px] py-[3px] rounded-full cursor-default',
                  closingSoon
                    ? 'bg-[#fef3c7] text-[#d97706]'
                    : 'bg-[#dcfce7] text-[#16a34a]',
                )}
              >
                {closingSoon
                  ? t('inbox.thread.windowRemainingLt1h')
                  : t('inbox.thread.windowRemaining', {
                      h: Math.floor(remaining / (60 * 60 * 1000)),
                      m: Math.floor((remaining % (60 * 60 * 1000)) / 60_000),
                    })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t('inbox.windowWarning')} — {formatRemaining(remaining)}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] font-medium px-[9px] py-[3px] rounded-full bg-[#f4f4f5] text-[#71717a]">
            {t('inbox.windowClosedShort')}
          </span>
        )}

        {/* Status badge */}
        {isResolved && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {t('inbox.thread.resolved')}
          </Badge>
        )}

        {/* Claim button (AGENT when unassigned) */}
        {canClaim && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={patch.isPending}
            onClick={handleClaim}
          >
            <UserPlus className="size-3 mr-1" />
            {t('inbox.thread.claimBtn')}
          </Button>
        )}

        {/* Assign to (MANAGER+) */}
        {canAssign && members.length > 0 && (
          <Select
            value={conversation.assignedToUserId ?? ''}
            onValueChange={handleAssign}
          >
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue placeholder={t('inbox.thread.assignTo')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassign__">
                {t('inbox.thread.unassignOption')}
              </SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Resolve / Reopen (MANAGER+ or AGENT on own chat) */}
        {canResolve && (
          <Button
            size="sm"
            variant={isResolved ? 'outline' : 'default'}
            className="h-7 text-xs"
            disabled={patch.isPending}
            onClick={handleResolve}
          >
            {isResolved ? (
              <>
                <RotateCcw className="size-3 mr-1" />
                {t('inbox.thread.reopenBtn')}
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3 mr-1" />
                {t('inbox.thread.resolveBtn')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main thread view ──────────────────────────────────────────────────────────

interface ConversationThreadProps {
  slug: string;
  conversation: WaConversation;
  sseConnected?: boolean;
}

export function ConversationThread({
  slug,
  conversation,
  sseConnected = false,
}: ConversationThreadProps) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.activeWorkspaceRole);
  // WorkspaceLayout sets activeContext which includes workspace id; we read it
  // from activeWorkspaceId in the store.
  const workspaceId = useAuthStore((s) => s.activeWorkspaceId) ?? '';
  const { data, isLoading } = useMessages(slug, conversation.id, {
    sseConnected,
  });
  const { data: templatesData } = useTemplates(slug);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Presence + assignment events ────────────────────────────────────────
  const { viewers } = useInboxPresence(slug, conversation.id);
  const { data: eventsData } = useAssignmentEvents(slug, conversation.id);
  const { data: rosterData } = useMembers(slug, workspaceId);
  const memberNames = useMemo(
    () =>
      Object.fromEntries(
        (rosterData?.members ?? []).map((m) => [m.userId, m.fullName]),
      ) as Record<string, string>,
    [rosterData?.members],
  );

  const windowOpen = isWindowOpen(conversation.lastInboundAt);
  const messages = data?.messages ?? [];
  const assignmentEvents = useMemo(
    () =>
      (eventsData?.events ?? []).map((ev) =>
        toAssignmentEventView(ev, memberNames),
      ),
    [eventsData?.events, memberNames],
  );

  // VIEWER cannot send
  const canSend = atLeast(role, 'AGENT');

  const templateBodyMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const tpl of templatesData?.templates ?? []) {
      const body = tpl.components.find((c) => c.type === 'BODY')?.text;
      if (body) map[tpl.name] = body;
    }
    return map;
  }, [templatesData]);

  // ── Interleave messages + assignment events by timestamp ────────────────
  type ThreadItem =
    | { kind: 'message'; key: string; msg: WaMessage; sortTs: number }
    | { kind: 'event'; key: string; event: WaAssignmentEvent; sortTs: number };

  const threadItems = useMemo<ThreadItem[]>(() => {
    const items: ThreadItem[] = [
      ...messages.map((msg) => ({
        kind: 'message' as const,
        key: msg.id,
        msg,
        sortTs: new Date(msg.timestamp).getTime(),
      })),
      ...assignmentEvents.map((ev) => ({
        kind: 'event' as const,
        key: ev.id,
        event: ev,
        sortTs: new Date(ev.createdAt).getTime(),
      })),
    ];
    items.sort((a, b) => a.sortTs - b.sortTs);
    return items;
  }, [messages, assignmentEvents]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadItems.length]);

  useEffect(() => {
    for (const msg of messages) {
      if (
        msg.direction !== 'outbound' ||
        msg.status !== 'failed' ||
        !recentOutboundIds.has(msg.id) ||
        toastedFailureIds.has(msg.id)
      ) {
        continue;
      }
      toastedFailureIds.add(msg.id);
      toast.error(msg.failureReason ?? t('inbox.composer.deliveryFailed'));
    }
  }, [messages, t]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Thread header with actions */}
      <div className="shrink-0">
        <ThreadHeader
          slug={slug}
          workspaceId={workspaceId}
          conversation={conversation}
          viewers={viewers}
        />
      </div>

      {/* 24h education banner when window closed */}
      {!windowOpen && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800/40 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {t('education.OUTSIDE_CUSTOMER_CARE_WINDOW.title')}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('education.OUTSIDE_CUSTOMER_CARE_WINDOW.body')}
            </p>
          </div>
        </div>
      )}

      {/* VIEWER read-only hint */}
      {!canSend && (
        <div className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-300">
          {t('inbox.thread.viewerReadOnly')}
        </div>
      )}

      {/* Messages — the only pane that should scroll */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-4 py-3 bg-[#fafafa]">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center text-sm">
            {t('inbox.thread.empty')}
          </p>
        )}
        {threadItems.map((item) =>
          item.kind === 'message' ? (
            <MessageBubble
              key={item.key}
              msg={item.msg}
              templateBodyMap={templateBodyMap}
            />
          ) : (
            <SystemEventLine key={item.key} event={item.event} />
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer — hidden for VIEWER */}
      {canSend && (
        <div className="shrink-0">
          {windowOpen ? (
            <Tabs defaultValue="text">
              <div className="border-t border-[#e4e4e7]">
                <TabsList className="h-auto rounded-none bg-transparent p-0 w-full justify-start gap-0 border-b border-[#e4e4e7]">
                  <TabsTrigger
                    value="text"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#18181b] data-[state=active]:text-[#18181b] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#71717a] text-[12px] font-medium px-3 py-2 -mb-px"
                  >
                    {t('inbox.composer.tabText')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="template"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#18181b] data-[state=active]:text-[#18181b] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#71717a] text-[12px] font-medium px-3 py-2 -mb-px"
                  >
                    {t('inbox.composer.tabTemplate')}
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="text" className="mt-0">
                <TextComposer
                  slug={slug}
                  conversationId={conversation.id}
                  canAttach={true}
                />
              </TabsContent>
              <TabsContent value="template" className="mt-0">
                <TemplateComposer
                  slug={slug}
                  conversationId={conversation.id}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <TemplateComposer slug={slug} conversationId={conversation.id} />
          )}
        </div>
      )}
    </div>
  );
}
