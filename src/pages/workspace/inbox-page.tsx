import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, ChevronLeft, ChevronRight, MessageSquare, Pencil, Search, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { useFcmWebPush } from '@/hooks/use-fcm-web-push';
import { useConversations } from '@/api/hooks/use-messages';
import { useMembers } from '@/api/hooks/use-members';
import type {
  ConversationFilters,
  ConversationTab,
  ConversationWindowFilter,
  WaConversation,
} from '@/api/messages.api';
import { ConversationThread } from './components/conversation-thread';
import { NewConversationDialog } from './components/new-conversation-dialog';
import { InboxContactRail } from './components/inbox-contact-rail';
import { DisconnectedBanner } from '@/components/whatsapp/disconnected-banner';
import { cn } from '@/lib/utils';
import { getAvatarColors, getInitials } from '@/lib/contact-avatar';
import { formatRelativeShort } from '@/lib/relative-time';
import { useNotificationStore } from '@/stores/notification.store';

/** Radix Select forbids Item value=""; these sentinels mean "no filter". */
const FILTER_WINDOW_ALL = '__all__';
const FILTER_ASSIGNEE_ALL = '__all__';

function windowMs(lastInboundAt: string | null): number {
  if (!lastInboundAt) return 0;
  const elapsed = Date.now() - new Date(lastInboundAt).getTime();
  return Math.max(0, 24 * 60 * 60 * 1000 - elapsed);
}

function WindowStrip({ lastInboundAt }: { lastInboundAt: string | null }) {
  const remaining = windowMs(lastInboundAt);
  const open = remaining > 0;
  const closingSoon = open && remaining < 60 * 60 * 1000;
  const color = open ? (closingSoon ? '#f59e0b' : '#22c55e') : '#ef4444';
  return (
    <span
      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-[2px]"
      style={{ backgroundColor: color }}
    />
  );
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConvItem({
  conv,
  isSelected,
  onSelect,
}: {
  conv: WaConversation;
  isSelected: boolean;
  onSelect: (c: WaConversation) => void;
}) {
  const { t, i18n } = useTranslation();
  const initials = getInitials(conv.contactName, conv.contactPhone);
  const { bg, text } = getAvatarColors(conv.contactName ?? conv.contactPhone);
  const timestamp = formatRelativeShort(
    conv.lastMessage?.timestamp ?? conv.updatedAt,
    { locale: i18n.language, nowLabel: t('inbox.now') },
  );
  const tags = conv.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const extraTagCount = tags.length - visibleTags.length;

  const unread = conv.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conv)}
      className={cn(
        'relative w-full text-left flex items-start gap-[10px] py-[10px] pr-3 pl-4 border-b border-[#e4e4e7] transition-colors',
        isSelected ? 'bg-[#f4f4f5]' : 'hover:bg-[#f9f9f9]',
      )}
    >
      <WindowStrip lastInboundAt={conv.lastInboundAt} />
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
          bg,
          text,
        )}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'truncate max-w-[140px] text-[13px] text-[#18181b]',
              unread ? 'font-semibold' : 'font-medium',
            )}
          >
            {conv.contactName ?? conv.contactPhone}
          </span>
          <span className="text-[11px] text-[#a1a1aa] shrink-0">
            {timestamp}
          </span>
        </div>
        <p className="text-[12px] text-[#71717a] truncate mb-1">
          {conv.lastMessage
            ? (conv.lastMessage.body ??
              (conv.lastMessage.templateName
                ? t('inbox.lastMessageTemplate', {
                    name: conv.lastMessage.templateName,
                  })
                : '—'))
            : '—'}
        </p>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="border border-[#e4e4e7] text-[#71717a] text-[10px] px-[6px] py-px rounded-full"
              >
                {tag}
              </span>
            ))}
            {extraTagCount > 0 && (
              <span className="border border-[#e4e4e7] text-[#71717a] text-[10px] px-[6px] py-px rounded-full">
                +{extraTagCount}
              </span>
            )}
          </div>
          {unread && (
            <span className="bg-[#ef4444] text-white text-[10px] font-semibold px-[6px] py-px rounded-full shrink-0">
              {conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function InboxPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { connected: sseConnected } = useInboxRealtime(ws.slug);
  const [activeTab, setActiveTab] = useState<ConversationTab>('all');
  const [search, setSearch] = useState('');

  // Viewing the inbox clears its "unviewed update" nav dot.
  useEffect(() => {
    useNotificationStore.getState().clearHasUpdate('inbox');
  }, []);

  // ── Panel collapse state ─────────────────────────────────────────────────
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // ── Server-side filters ──────────────────────────────────────────────────
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterWindow, setFilterWindow] = useState<
    ConversationWindowFilter | ''
  >('');
  const [filterTag, setFilterTag] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  const serverFilters = useMemo<ConversationFilters>(
    () => ({
      unread: filterUnread || undefined,
      window: (filterWindow as ConversationWindowFilter) || undefined,
      tag: filterTag.trim() || undefined,
      assigneeUserId: filterAssignee || undefined,
    }),
    [filterUnread, filterWindow, filterTag, filterAssignee],
  );

  const hasActiveFilters =
    filterUnread || !!filterWindow || !!filterTag.trim() || !!filterAssignee;

  function clearFilters() {
    setFilterUnread(false);
    setFilterWindow('');
    setFilterTag('');
    setFilterAssignee('');
  }

  // Members for assignee selector
  const { data: roster } = useMembers(ws.slug, ws.id);
  const members = roster?.members ?? [];

  const { data, isLoading } = useConversations(ws.slug, {
    sseConnected,
    tab: activeTab,
    filters: serverFilters,
  });
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

  const conversations = useMemo(() => data?.conversations ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.contactName ?? '').toLowerCase().includes(q) ||
        c.contactPhone.toLowerCase().includes(q) ||
        (c.lastMessage?.body ?? '').toLowerCase().includes(q),
    );
  }, [conversations, search]);

  // When conversations refresh from SSE/poll, keep the selected conv in sync.
  const syncedSelected = useMemo(() => {
    if (!selectedConv) return null;
    return conversations.find((c) => c.id === selectedConv.id) ?? selectedConv;
  }, [conversations, selectedConv]);

  // ── j / k / Esc keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      // Ignore when user is typing in an input, textarea, or contenteditable.
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedConv(null);
        return;
      }

      if ((e.key === 'j' || e.key === 'k') && filtered.length > 0) {
        e.preventDefault();
        const idx = syncedSelected
          ? filtered.findIndex((c) => c.id === syncedSelected.id)
          : -1;
        const next =
          e.key === 'j'
            ? idx < filtered.length - 1
              ? idx + 1
              : 0
            : idx > 0
              ? idx - 1
              : filtered.length - 1;
        setSelectedConv(filtered[next]);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtered, syncedSelected]);

  const emptyKey =
    activeTab === 'mine'
      ? 'inbox.empty.mychats'
      : activeTab === 'active'
        ? 'inbox.empty.active'
        : 'inbox.empty.body';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Action bar */}
      <div className="flex shrink-0 items-center justify-end gap-2">
        <NewConversationDialog
          slug={ws.slug}
          onCreated={(conv) => setSelectedConv(conv)}
        />
      </div>

      {/* WABA disconnected banner */}
      <div className="shrink-0">
        <DisconnectedBanner />
      </div>

      {/* Notification banners */}
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

      {/* 3-pane: list | thread | right rail */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        {/* LEFT — conversation list */}
        <div className={cn(
          'flex min-h-0 shrink-0 flex-col border-r bg-white transition-all duration-200',
          leftCollapsed ? 'w-9' : 'w-[288px]',
        )}>
          {/* Collapsed strip — just a toggle button */}
          {leftCollapsed && (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              className="flex flex-1 flex-col items-center justify-start pt-3 gap-1 text-[#a1a1aa] hover:text-[#18181b] transition-colors"
              title={t('inbox.title')}
            >
              <ChevronRight className="size-4" />
            </button>
          )}

          {/* Expanded panel content */}
          {!leftCollapsed && (<>
          {/* Panel header */}
          <div className="flex items-center justify-between px-[14px] py-3 border-b border-[#e4e4e7] shrink-0">
            <h3 className="text-[14px] font-semibold text-[#18181b]">{t('inbox.title')}</h3>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setLeftCollapsed(true)}
                className="flex size-7 items-center justify-center rounded-[5px] text-[#a1a1aa] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
                title={t('inbox.collapseList')}
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex size-7 items-center justify-center rounded-[5px] text-[#71717a] hover:bg-[#f4f4f5] transition-colors',
                      hasActiveFilters && 'text-[#18181b] bg-[#f4f4f5]',
                    )}
                  >
                    <SlidersHorizontal className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3 flex flex-col gap-3">
                  {/* Unread */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="filter-unread"
                      checked={filterUnread}
                      onCheckedChange={setFilterUnread}
                    />
                    <Label htmlFor="filter-unread" className="text-[12px] cursor-pointer">
                      {t('inbox.filters.unread')}
                    </Label>
                  </div>

                  {/* Window */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-[#71717a]">{t('inbox.filters.window')}</Label>
                    <Select
                      value={filterWindow || FILTER_WINDOW_ALL}
                      onValueChange={(v) =>
                        setFilterWindow(v === FILTER_WINDOW_ALL ? '' : (v as ConversationWindowFilter))
                      }
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue placeholder={t('inbox.tabs.all')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FILTER_WINDOW_ALL} className="text-xs">{t('inbox.tabs.all')}</SelectItem>
                        <SelectItem value="open" className="text-xs">{t('inbox.filters.windowOpen')}</SelectItem>
                        <SelectItem value="closed" className="text-xs">{t('inbox.filters.windowClosed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tag */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-[#71717a]">{t('inbox.filters.tag')}</Label>
                    <Input
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      placeholder={t('inbox.filters.tag')}
                      className="h-8 text-[12px]"
                    />
                  </div>

                  {/* Assignee */}
                  {members.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-[11px] text-[#71717a]">{t('inbox.filters.assignee')}</Label>
                      <Select
                        value={filterAssignee || FILTER_ASSIGNEE_ALL}
                        onValueChange={(v) => setFilterAssignee(v === FILTER_ASSIGNEE_ALL ? '' : v)}
                      >
                        <SelectTrigger className="h-8 text-[12px]">
                          <SelectValue placeholder={t('inbox.filters.assignee')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={FILTER_ASSIGNEE_ALL} className="text-xs">{t('inbox.filters.assignee')}</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId} className="text-xs">
                              {m.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-[11px] text-[#71717a] hover:text-[#18181b] transition-colors"
                    >
                      <X className="size-3" />
                      {t('inbox.filters.clear')}
                    </button>
                  )}
                </PopoverContent>
              </Popover>

              <NewConversationDialog
                slug={ws.slug}
                onCreated={(conv) => setSelectedConv(conv)}
                trigger={
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-[5px] text-[#71717a] hover:bg-[#f4f4f5] transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                }
              />
            </div>
          </div>

          {/* Quick tabs: All / Active / Mine */}
          <div className="flex border-b border-[#f4f4f5] shrink-0 px-[14px]">
            {(['all', 'active', 'mine'] as ConversationTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); setSelectedConv(null); }}
                className={cn(
                  'px-0 py-2 mr-4 text-[13px] border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-[#18181b] text-[#18181b] font-medium'
                    : 'border-transparent text-[#71717a] hover:text-[#18181b]',
                )}
              >
                {t(`inbox.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-[10px] py-2 shrink-0 border-b border-[#f4f4f5]">
            <div className="flex items-center gap-[6px] bg-[#f4f4f5] rounded-[6px] px-[10px] py-[6px]">
              <Search className="size-3 text-[#a1a1aa] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('inbox.search')}
                className="border-none bg-transparent outline-none text-[12px] text-[#18181b] placeholder:text-[#a1a1aa] w-full"
              />
            </div>
          </div>

          {/* List body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
                <MessageSquare className="text-muted-foreground size-8" />
                <div>
                  <p className="font-medium text-sm">
                    {t('inbox.empty.title')}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {t(emptyKey)}
                  </p>
                </div>
              </div>
            )}

            {filtered.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                isSelected={syncedSelected?.id === conv.id}
                onSelect={setSelectedConv}
              />
            ))}
          </div>
          </>)}
        </div>

        {/* MIDDLE — thread */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {syncedSelected ? (
            <ConversationThread
              slug={ws.slug}
              conversation={syncedSelected}
              sseConnected={sseConnected}
            />
          ) : (
            <Card className="h-full border-0 rounded-none">
              <CardContent className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <MessageSquare className="text-muted-foreground size-10" />
                <div>
                  <p className="font-medium">
                    {t('inbox.thread.selectPrompt')}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t('inbox.thread.selectHint')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Right rail toggle — shown when a conversation is open */}
          {syncedSelected && (
            <button
              type="button"
              onClick={() => setRightCollapsed((v) => !v)}
              className="absolute right-0 top-[52px] flex h-8 w-5 -translate-y-1/2 items-center justify-center rounded-l-[4px] border border-r-0 border-[#e4e4e7] bg-white text-[#a1a1aa] hover:text-[#18181b] hover:bg-[#f4f4f5] transition-colors z-10"
              title={rightCollapsed ? t('inbox.expandRail') : t('inbox.collapseRail')}
            >
              {rightCollapsed ? (
                <ChevronLeft className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
          )}
        </div>

        {/* RIGHT — CRM rail */}
        {syncedSelected && !rightCollapsed && (
          <InboxContactRail slug={ws.slug} conversation={syncedSelected} />
        )}
      </div>
    </div>
  );
}
