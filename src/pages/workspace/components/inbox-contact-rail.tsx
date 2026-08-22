/**
 * Right rail for the 3-pane inbox: CRM panel for the selected conversation's
 * contact. Shows name/phone, opt-in toggle, tags, pipeline stage, follow-up
 * datetime, notes, and optional key/value attributes. Write controls are
 * hidden for VIEWER.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Phone,
  Tag,
  StickyNote,
  Clock,
  ChevronRight,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_RANK } from '@/types/api';
import type { WorkspaceRole } from '@/types/api';
import { useUpdateContact } from '@/api/hooks/use-contacts';
import { useContactNotes, useAddContactNote } from '@/api/hooks/use-contact-notes';
import { usePipelineStages } from '@/api/hooks/use-pipeline-stages';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/api/contacts.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { WaConversation } from '@/api/messages.api';
import { cn } from '@/lib/utils';

function atLeast(role: WorkspaceRole | null, min: WorkspaceRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

// ── Tags editor ───────────────────────────────────────────────────────────────

function TagsEditor({
  slug,
  contactId,
  tags,
  canWrite,
}: {
  slug: string;
  contactId: string;
  tags: string[];
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const [newTag, setNewTag] = useState('');
  const update = useUpdateContact(slug);

  function addTag() {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;
    update.mutate(
      { id: contactId, body: { tags: [...tags, tag] } },
      {
        onSuccess: () => setNewTag(''),
        onError: (err) => toast.error(err),
      },
    );
  }

  function removeTag(tag: string) {
    update.mutate(
      { id: contactId, body: { tags: tags.filter((t) => t !== tag) } },
      { onError: (err) => toast.error(err) },
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className={cn('text-xs gap-1', canWrite && 'cursor-pointer hover:line-through')}
          onClick={canWrite ? () => removeTag(tag) : undefined}
        >
          {tag}
        </Badge>
      ))}
      {tags.length === 0 && (
        <span className="text-xs text-muted-foreground">
          {t('inbox.rail.noTags')}
        </span>
      )}
      {canWrite && (
        <div className="flex gap-1 w-full mt-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={t('inbox.rail.addTag')}
            className="h-6 text-xs flex-1"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={addTag}
            disabled={update.isPending || !newTag.trim()}
          >
            {update.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <PlusCircle className="size-3" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Notes section ─────────────────────────────────────────────────────────────

function NotesSection({
  slug,
  contactId,
  canWrite,
}: {
  slug: string;
  contactId: string;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const { data, isLoading } = useContactNotes(slug, contactId);
  const add = useAddContactNote(slug, contactId);

  const notes = data?.notes ?? [];

  function submit() {
    const body = draft.trim();
    if (!body) return;
    add.mutate(
      { body },
      {
        onSuccess: () => setDraft(''),
        onError: (err) => toast.error(err),
      },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {isLoading && <Skeleton className="h-8 w-full" />}
      {!isLoading && notes.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('inbox.rail.noNotes')}</p>
      )}
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs"
        >
          <p className="whitespace-pre-wrap">{note.body}</p>
          <p className="text-muted-foreground mt-0.5">
            {new Date(note.createdAt).toLocaleString([], {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ))}
      {canWrite && (
        <div className="flex flex-col gap-1 mt-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('inbox.rail.addNote')}
            className="min-h-12 max-h-24 resize-none text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="self-end h-7 text-xs"
            onClick={submit}
            disabled={add.isPending || !draft.trim()}
          >
            {add.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
            {t('inbox.rail.saveNote')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main rail ─────────────────────────────────────────────────────────────────

interface InboxContactRailProps {
  slug: string;
  conversation: WaConversation;
}

export function InboxContactRail({ slug, conversation }: InboxContactRailProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.activeWorkspaceRole);
  const canWrite = atLeast(role, 'AGENT');

  const contactId = conversation.contactId;
  const retriedLink = useRef<string | null>(null);

  // Legacy threads may have a phone but no CRM contact. Listing conversations
  // now backfills contactId — refetch once so tags/notes appear without a reload.
  useEffect(() => {
    if (contactId) return;
    if (retriedLink.current === conversation.id) return;
    retriedLink.current = conversation.id;
    void qc.invalidateQueries({
      queryKey: queryKeys.messages.conversationsAll(slug),
    });
  }, [contactId, conversation.id, qc, slug]);

  // Fetch the full contact record (has tags, optedIn, attributes, etc.)
  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: queryKeys.contacts.byId(slug, contactId ?? ''),
    queryFn: () => contactsApi.getById(slug, contactId!),
    enabled: !!contactId && slug.length > 0,
    staleTime: STALE.STANDARD,
  });

  const { data: stagesData } = usePipelineStages(slug);
  const stages = stagesData?.pipelineStages ?? [];

  const update = useUpdateContact(slug);

  function handleOptIn(checked: boolean) {
    if (!contactId) return;
    update.mutate(
      { id: contactId, body: { optedIn: checked } },
      { onError: (err) => toast.error(err) },
    );
  }

  function handleStage(stageId: string) {
    if (!contactId) return;
    update.mutate(
      {
        id: contactId,
        body: { pipelineStageId: stageId === '__none__' ? null : stageId },
      },
      { onError: (err) => toast.error(err) },
    );
  }

  function handleFollowUp(e: React.ChangeEvent<HTMLInputElement>) {
    if (!contactId) return;
    const value = e.target.value;
    update.mutate(
      { id: contactId, body: { followUpAt: value ? new Date(value).toISOString() : null } },
      { onError: (err) => toast.error(err) },
    );
  }

  const followUpValue = contact?.followUpAt
    ? (() => {
        const d = new Date(contact.followUpAt!);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : '';

  const attributes = contact?.attributes ?? {};
  const hasAttributes = Object.keys(attributes).length > 0;

  if (!contactId) {
    return (
      <div className="flex h-full min-h-0 w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-l">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <User className="size-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t('inbox.rail.noContact')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-l">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/20 shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('inbox.rail.title')}
        </p>
      </div>

      {contactLoading ? (
        <div className="p-3 flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      ) : (
        <div className="flex flex-col divide-y text-sm">
          {/* Identity */}
          <Section icon={User} label={t('inbox.rail.contact')}>
            <p className="font-medium text-sm truncate">
              {contact?.name ?? conversation.contactName ?? '—'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="size-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {conversation.contactPhone}
              </p>
            </div>
            {/* Manage leads link — /contacts for now */}
            <a
              href={`/w/${slug}/contacts`}
              className="flex items-center gap-0.5 mt-1.5 text-xs text-primary hover:underline"
            >
              {t('inbox.thread.manageleads')}
              <ChevronRight className="size-3" />
            </a>
          </Section>

          <Separator />

          {/* Opt-in */}
          <Section icon={Phone} label={t('inbox.rail.optIn')}>
            <div className="flex items-center gap-2">
              <Switch
                checked={contact?.optedIn ?? false}
                onCheckedChange={canWrite ? handleOptIn : undefined}
                disabled={!canWrite || update.isPending}
                aria-label={t('inbox.rail.optIn')}
              />
              <span className="text-xs text-muted-foreground">
                {contact?.optedIn ? t('inbox.rail.optedIn') : t('inbox.rail.notOptedIn')}
              </span>
            </div>
          </Section>

          <Separator />

          {/* Tags */}
          <Section icon={Tag} label={t('inbox.rail.tags')}>
            <TagsEditor
              slug={slug}
              contactId={contactId}
              tags={contact?.tags ?? []}
              canWrite={canWrite}
            />
          </Section>

          <Separator />

          {/* Pipeline stage */}
          {stages.length > 0 && (
            <>
              <Section icon={ChevronRight} label={t('inbox.rail.stage')}>
                {canWrite ? (
                  <Select
                    value={contact?.pipelineStageId ?? '__none__'}
                    onValueChange={handleStage}
                    disabled={update.isPending}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={t('inbox.rail.noStage')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('inbox.rail.noStage')}</SelectItem>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {stages.find((s) => s.id === contact?.pipelineStageId)?.name ??
                      t('inbox.rail.noStage')}
                  </p>
                )}
              </Section>
              <Separator />
            </>
          )}

          {/* Follow-up */}
          <Section icon={Clock} label={t('inbox.rail.followUp')}>
            {canWrite ? (
              <Input
                type="datetime-local"
                value={followUpValue}
                onChange={handleFollowUp}
                className="h-7 text-xs"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {followUpValue
                  ? new Date(contact!.followUpAt!).toLocaleString([], {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : t('inbox.rail.noFollowUp')}
              </p>
            )}
          </Section>

          <Separator />

          {/* Notes */}
          <Section icon={StickyNote} label={t('inbox.rail.notes')}>
            <NotesSection
              slug={slug}
              contactId={contactId}
              canWrite={canWrite}
            />
          </Section>

          {/* Attributes (read-only key/value) */}
          {hasAttributes && (
            <>
              <Separator />
              <Section icon={Tag} label={t('inbox.rail.attributes')}>
                <div className="flex flex-col gap-1">
                  {Object.entries(attributes).map(([key, val]) => (
                    <div key={key} className="flex gap-1 text-xs">
                      <span className="text-muted-foreground shrink-0">{key}:</span>
                      <span className="truncate">{val}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
