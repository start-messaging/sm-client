import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { MessageDeliveryStatus } from '@/components/inbox/message-delivery-status';
import { useMessages, useSendMessage } from '@/api/hooks/use-messages';
import { useTemplates } from '@/api/hooks/use-templates';
import { toast } from '@/lib/toast';
import type { WaConversation, WaMessage } from '@/api/messages.api';
import { cn } from '@/lib/utils';

// ── 24h window helper ───────────────────────────────────────────────────────

function isWindowOpen(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

/** Message ids we just sent — toast once if Meta later marks them failed. */
const recentOutboundIds = new Set<string>();
const toastedFailureIds = new Set<string>();

function trackOutbound(id: string) {
  recentOutboundIds.add(id);
  window.setTimeout(() => recentOutboundIds.delete(id), 120_000);
}

// ── Text composer ───────────────────────────────────────────────────────────

const textSchema = z.object({
  text: z.string().min(1).max(4096),
});
type TextForm = z.infer<typeof textSchema>;

function TextComposer({
  slug,
  conversationId,
}: {
  slug: string;
  conversationId: string;
}) {
  const { t } = useTranslation();
  const send = useSendMessage(slug, conversationId);
  const { register, handleSubmit, reset, formState } = useForm<TextForm>({
    resolver: zodResolver(textSchema),
    defaultValues: { text: '' },
  });

  const onSubmit = (v: TextForm) =>
    send.mutate(
      { type: 'text', text: v.text },
      {
        onSuccess: (msg) => {
          trackOutbound(msg.id);
          reset();
        },
        onError: (err) => toast.error(err),
      },
    );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex items-end gap-2 border-t p-3"
    >
      <Textarea
        placeholder={t('inbox.composer.textPlaceholder')}
        className="min-h-15 max-h-40 resize-none flex-1"
        {...register('text')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(onSubmit)();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={send.isPending || !formState.isDirty}
        aria-label={t('inbox.composer.send')}
      >
        {send.isPending ? <Spinner /> : <Send className="size-4" />}
      </Button>
    </form>
  );
}

// ── Template composer ───────────────────────────────────────────────────────

/** Extract ordered {{1}}, {{2}}… placeholders from a template BODY component. */
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

// ── Bubble ──────────────────────────────────────────────────────────────────

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

  // Resolve body: server body > template cache body > fallback label
  const resolvedBody =
    msg.body ??
    (msg.templateName ? (templateBodyMap[msg.templateName] ?? null) : null);

  return (
    <div
      className={cn(
        'max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm',
        outbound
          ? 'self-end bg-[#dcf8c6] text-gray-800 dark:bg-[#025c4c] dark:text-gray-100'
          : 'self-start bg-white text-gray-800 dark:bg-[#202c33] dark:text-gray-100',
        failed && 'bg-red-100 dark:bg-red-900/40',
      )}
    >
      {msg.templateName && (
        <p className="mb-1 text-xs font-semibold opacity-60">
          {t('inbox.templateBubble.label', { name: msg.templateName })}
        </p>
      )}
      <p className="whitespace-pre-wrap wrap-break-word">
        {resolvedBody ??
          (msg.templateName
            ? t('inbox.templateBubble.bodyFallback')
            : '—')}
      </p>
      {failed && msg.failureReason && (
        <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 leading-snug">
          {msg.failureReason}
        </p>
      )}
      <div className="mt-1 flex items-center justify-end gap-1">
        <span className="text-[10px] opacity-50">
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

// ── Main thread view ─────────────────────────────────────────────────────────

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
  const { data, isLoading } = useMessages(slug, conversation.id, {
    sseConnected,
  });
  const { data: templatesData } = useTemplates(slug);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const windowOpen = isWindowOpen(conversation.lastInboundAt);
  const messages = data?.messages ?? [];

  /** Map templateName → BODY text for inline bubble preview. */
  const templateBodyMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const tpl of (templatesData?.templates ?? [])) {
      const body = tpl.components.find((c) => c.type === 'BODY')?.text;
      if (body) map[tpl.name] = body;
    }
    return map;
  }, [templatesData]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Toast when a recently sent outbound message fails via webhook.
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
      toast.error(
        msg.failureReason ?? t('inbox.composer.deliveryFailed'),
      );
    }
  }, [messages, t]);

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">
            {conversation.contactName ?? conversation.contactPhone}
          </p>
          <p className="text-muted-foreground text-xs">
            {conversation.contactPhone}
          </p>
        </div>
        <Badge variant={windowOpen ? 'default' : 'secondary'} className="text-xs">
          {windowOpen
            ? t('inbox.windowWarning')
            : t('inbox.windowClosed')}
        </Badge>
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

      {/* Messages — WhatsApp-style chat background */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-3 bg-[#e5ddd5] dark:bg-[#0d1417]">
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
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} templateBodyMap={templateBodyMap} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer tabs: text (if window open) / template */}
      <div className="shrink-0">
        {windowOpen ? (
          <Tabs defaultValue="text">
            <div className="border-t px-3 pt-2">
              <TabsList className="h-7 text-xs">
                <TabsTrigger value="text" className="px-2 text-xs">
                  {t('inbox.composer.tabText')}
                </TabsTrigger>
                <TabsTrigger value="template" className="px-2 text-xs">
                  {t('inbox.composer.tabTemplate')}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="text" className="mt-0">
              <TextComposer slug={slug} conversationId={conversation.id} />
            </TabsContent>
            <TabsContent value="template" className="mt-0">
              <TemplateComposer slug={slug} conversationId={conversation.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <TemplateComposer slug={slug} conversationId={conversation.id} />
        )}
      </div>
    </div>
  );
}
