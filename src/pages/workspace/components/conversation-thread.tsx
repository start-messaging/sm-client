import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useMessages, useSendMessage } from '@/api/hooks/use-messages';
import { useTemplates } from '@/api/hooks/use-templates';
import { toast } from '@/lib/toast';
import type { WaConversation } from '@/api/messages.api';
import { cn } from '@/lib/utils';

// ── 24h window helper ───────────────────────────────────────────────────────

function isWindowOpen(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
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
        onSuccess: () => reset(),
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
        className="min-h-[60px] max-h-[160px] resize-none flex-1"
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

  const [selectedName, setSelectedName] = useState('');
  const [selectedLang, setSelectedLang] = useState('');

  function handleSend() {
    if (!selectedName || !selectedLang) return;
    send.mutate(
      {
        type: 'template',
        templateName: selectedName,
        templateLanguage: selectedLang,
      },
      {
        onSuccess: () => {
          setSelectedName('');
          setSelectedLang('');
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

  return (
    <div className="border-t p-3 flex items-end gap-2">
      <Select
        value={selectedName}
        onValueChange={(v) => {
          setSelectedName(v);
          const tpl = approvedTemplates.find((t) => t.name === v);
          setSelectedLang(tpl?.language ?? 'en_US');
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={t('inbox.composer.pickTemplate')} />
        </SelectTrigger>
        <SelectContent>
          {approvedTemplates.map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.name}>
              <span className="font-mono text-sm">{tpl.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {tpl.language}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!selectedName || send.isPending}
        onClick={handleSend}
      >
        {send.isPending && <Spinner />}
        {t('inbox.composer.sendTemplate')}
      </Button>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const windowOpen = isWindowOpen(conversation.lastInboundAt);
  const messages = data?.messages ?? [];

  // Scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="font-semibold text-sm">
            {conversation.contactName ?? conversation.contactPhone}
          </p>
          <p className="text-xs text-muted-foreground">
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
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800/40 dark:bg-amber-950/20 shrink-0">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {t('education.OUTSIDE_CUSTOMER_CARE_WINDOW.title')}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t('education.OUTSIDE_CUSTOMER_CARE_WINDOW.body')}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            {t('inbox.thread.empty')}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[75%] rounded-xl px-3 py-2 text-sm',
              msg.direction === 'outbound'
                ? 'self-end bg-primary text-primary-foreground'
                : 'self-start bg-muted text-foreground',
            )}
          >
            {msg.templateName && (
              <p className="text-xs opacity-70 mb-0.5 font-mono">
                [{msg.templateName}]
              </p>
            )}
            <p className="whitespace-pre-wrap break-words">
              {msg.body ?? '—'}
            </p>
            <p className="text-[10px] opacity-60 mt-1 text-right">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer tabs: text (if window open) / template */}
      <div className="shrink-0">
        {windowOpen ? (
          <Tabs defaultValue="text">
            <div className="border-t px-3 pt-2">
              <TabsList className="h-7 text-xs">
                <TabsTrigger value="text" className="text-xs px-2">
                  {t('inbox.composer.tabText')}
                </TabsTrigger>
                <TabsTrigger value="template" className="text-xs px-2">
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
