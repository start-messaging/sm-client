import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Bell, BellOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { useFcmWebPush } from '@/hooks/use-fcm-web-push';
import { useConversations } from '@/api/hooks/use-messages';
import type { WaConversation } from '@/api/messages.api';
import { ConversationThread } from './components/conversation-thread';
import { NewConversationDialog } from './components/new-conversation-dialog';
import { cn } from '@/lib/utils';

function isWindowOpen(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

export function InboxPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { connected: sseConnected } = useInboxRealtime(ws.slug);
  const { data, isLoading } = useConversations(ws.slug, { sseConnected });
  const [selectedConv, setSelectedConv] = useState<WaConversation | null>(null);
  const {
    permission: notifPermission,
    registering,
    tokenRegistered,
    enable: requestNotifications,
  } = useFcmWebPush({
    foregroundTitle: t('inbox.notifications.newMessage'),
    foregroundBody: t('inbox.notifications.newMessageBody'),
  });

  const conversations = data?.conversations ?? [];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('inbox.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('inbox.subtitle')}</p>
        </div>
        <NewConversationDialog
          slug={ws.slug}
          onCreated={(conv) => setSelectedConv(conv)}
        />
      </div>

      <EducationSlot
        title={t('inbox.intro.title')}
        body={t('inbox.intro.body')}
        className="shrink-0"
      />

      {/* Notification permission / FCM registration */}
      {notifPermission === 'default' && (
        <div className="shrink-0 flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-800/40 dark:bg-sky-950/20">
          <Bell className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="flex-1 text-sky-800 dark:text-sky-300">
            {t('inbox.notifications.enableHint')}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs"
            disabled={registering}
            onClick={() => void requestNotifications()}
          >
            {t('inbox.notifications.enableCta')}
          </Button>
        </div>
      )}
      {notifPermission === 'granted' && !tokenRegistered && (
        <div className="shrink-0 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800/40 dark:bg-amber-950/20">
          <Bell className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-amber-800 dark:text-amber-300">
            {t('inbox.notifications.needPushToken')}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-xs"
            disabled={registering}
            onClick={() => void requestNotifications()}
          >
            {t('inbox.notifications.enableCta')}
          </Button>
        </div>
      )}
      {notifPermission === 'denied' && (
        <div className="shrink-0 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
          <BellOff className="size-3.5 shrink-0" />
          {t('inbox.notifications.denied')}
        </div>
      )}

      {/* Split-pane: list + thread */}
      <div className="flex flex-1 gap-0 rounded-lg border overflow-hidden min-h-120">
        {/* Left: conversation list */}
        <div className="w-72 shrink-0 flex flex-col border-r">
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('inbox.allConversations')}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="size-9 rounded-full shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5 pt-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-36" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && conversations.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
                <MessageSquare className="text-muted-foreground size-8" />
                <div>
                  <p className="font-medium text-sm">{t('inbox.empty.title')}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {t('inbox.empty.body')}
                  </p>
                </div>
              </div>
            )}

            {conversations.map((conv) => {
              const windowOpen = isWindowOpen(conv.lastInboundAt);
              const isSelected = selectedConv?.id === conv.id;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedConv(conv)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 px-3 py-3 border-b transition-colors hover:bg-muted/40',
                    isSelected && 'bg-muted/60',
                  )}
                >
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                    <MessageSquare className="text-muted-foreground size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-medium text-sm">
                        {conv.contactName ?? conv.contactPhone}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs tabular-nums shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs mt-0.5">
                      {conv.lastMessage
                        ? (conv.lastMessage.body
                            ?? (conv.lastMessage.templateName
                                ? t('inbox.lastMessageTemplate', { name: conv.lastMessage.templateName })
                                : '—'))
                        : '—'}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] mt-0.5',
                        windowOpen
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {windowOpen
                        ? t('inbox.windowWarning')
                        : t('inbox.windowClosed')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: thread panel */}
        <div className="flex-1 overflow-hidden">
          {selectedConv ? (
            <ConversationThread
              slug={ws.slug}
              conversation={selectedConv}
              sseConnected={sseConnected}
            />
          ) : (
            <Card className="h-full border-0 rounded-none">
              <CardContent className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <MessageSquare className="text-muted-foreground size-10" />
                <div>
                  <p className="font-medium">{t('inbox.thread.selectPrompt')}</p>
                  <p className="text-muted-foreground text-sm">
                    {t('inbox.thread.selectHint')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
