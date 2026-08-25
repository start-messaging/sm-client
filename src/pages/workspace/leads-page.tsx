/**
 * Leads Kanban — contacts grouped by pipeline stage.
 * Stages are columns; each card shows name, phone, assignee, follow-up.
 * Moving a contact to a new stage calls PATCH /contacts/:id { pipelineStageId }.
 * HTML5 drag-and-drop is the primary move mechanism; Select per card is the fallback.
 */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarClock, KanbanSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useContacts, useUpdateContact } from '@/api/hooks/use-contacts';
import { usePipelineStages } from '@/api/hooks/use-pipeline-stages';
import { useMembers } from '@/api/hooks/use-members';
import { type WaContact } from '@/api/contacts.api';
import type { PipelineStage } from '@/api/messages.api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { getAvatarColors, getInitials } from '@/lib/contact-avatar';

// ── Contact card ─────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: WaContact;
  stages: PipelineStage[];
  memberMap: Record<string, string>;
  onDragStart: (contactId: string) => void;
  onMove: (contactId: string, toStageId: string) => void;
  isPending: boolean;
}

function ContactCard({
  contact: c,
  stages,
  memberMap,
  onDragStart,
  onMove,
  isPending,
}: ContactCardProps) {
  const { t } = useTranslation();

  const followUpDate = c.followUpAt ? new Date(c.followUpAt) : null;
  const isOverdue = followUpDate !== null && followUpDate <= new Date();
  const currentStageId = c.pipelineStageId ?? '__none__';

  const initials = getInitials(c.name, c.phoneE164);
  const { bg, text } = getAvatarColors(c.name ?? c.phoneE164);

  const visibleTags = c.tags.slice(0, 2);
  const extraTagCount = c.tags.length - visibleTags.length;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', c.id);
        onDragStart(c.id);
      }}
      className={cn(
        'bg-white border border-[#e4e4e7] rounded-[10px] p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow flex flex-col gap-2',
        isOverdue && 'border-[#fca5a5]',
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            bg,
            text,
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#18181b] leading-tight">
            {c.name ?? <span className="text-[#71717a]">{c.phoneE164}</span>}
          </p>
          {c.name && (
            <p className="font-mono text-[11px] text-[#a1a1aa] mt-0.5">
              {c.phoneE164}
            </p>
          )}
        </div>
        {isPending && <Spinner className="size-3.5 shrink-0" />}
      </div>

      {/* Overdue banner */}
      {isOverdue && (
        <div className="flex items-center gap-1 rounded-[6px] bg-[#fee2e2] px-2 py-1">
          <CalendarClock className="size-3 shrink-0 text-[#dc2626]" />
          <span className="text-[11px] font-medium text-[#dc2626]">
            {t('leads.card.overdue')} · {followUpDate!.toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Tags */}
      {c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="bg-[#f4f4f5] text-[#18181b] text-[10px] font-medium px-[6px] py-px rounded-full"
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
      )}

      {/* Assignee */}
      <div className="flex items-center gap-1 text-[12px] text-[#71717a]">
        <Users className="size-3 shrink-0" />
        <span className="truncate">
          {c.assignedToUserId
            ? (memberMap[c.assignedToUserId] ?? t('leads.card.noAssignee'))
            : t('leads.card.noAssignee')}
        </span>
      </div>

      {/* Follow-up (non-overdue) */}
      {followUpDate && !isOverdue && (
        <div className="flex items-center gap-1 text-[12px] text-[#71717a]">
          <CalendarClock className="size-3 shrink-0" />
          <span>
            {t('leads.card.followUp', {
              date: followUpDate.toLocaleDateString(),
            })}
          </span>
        </div>
      )}

      {/* Move to stage */}
      <Select
        value={currentStageId}
        onValueChange={(v) => onMove(c.id, v)}
        disabled={isPending}
      >
        <SelectTrigger className="h-7 text-[11px] mt-0.5">
          <SelectValue placeholder={t('leads.card.moveTo')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t('leads.noStage')}</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stageId: string;
  title: string;
  contacts: WaContact[];
  stages: PipelineStage[];
  memberMap: Record<string, string>;
  pendingContactId: string | null;
  onDragStart: (contactId: string) => void;
  onMove: (contactId: string, toStageId: string) => void;
}

function KanbanColumn({
  stageId,
  title,
  contacts,
  stages,
  memberMap,
  pendingContactId,
  onDragStart,
  onMove,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const contactId = e.dataTransfer.getData('text/plain');
    if (contactId) {
      onMove(contactId, stageId);
    }
  }

  return (
    <div
      className={cn(
        'flex w-[272px] shrink-0 flex-col gap-2 rounded-[10px] p-2.5 transition-colors',
        isDragOver ? 'bg-[#e4e4e7]' : 'bg-[#f4f4f5]',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <h3 className="text-[12px] font-semibold text-[#18181b] truncate">
          {title}
        </h3>
        <span className="bg-white border border-[#e4e4e7] text-[#71717a] text-[10px] font-semibold px-[6px] py-px rounded-full tabular-nums shrink-0 ml-1.5">
          {contacts.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-12">
        {contacts.length === 0 ? (
          <div
            className={cn(
              'rounded-[8px] border border-dashed border-[#d4d4d8] p-4 text-center transition-colors',
              isDragOver && 'border-[#18181b]/30 bg-white/60',
            )}
          >
            <p className="text-[11px] text-[#a1a1aa]">
              {t('leads.empty.body')}
            </p>
          </div>
        ) : (
          contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              stages={stages}
              memberMap={memberMap}
              onDragStart={onDragStart}
              onMove={onMove}
              isPending={pendingContactId === c.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex w-[272px] shrink-0 flex-col gap-2 bg-[#f4f4f5] rounded-[10px] p-2.5"
        >
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-28 w-full rounded-[10px]" />
          <Skeleton className="h-28 w-full rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LeadsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();

  const { data: contactsData, isLoading: contactsLoading } = useContacts(
    ws.slug,
  );
  const { data: stagesData, isLoading: stagesLoading } = usePipelineStages(
    ws.slug,
  );
  const { data: membersData } = useMembers(ws.slug, ws.id);
  const updateContact = useUpdateContact(ws.slug);

  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const draggedContactId = useRef<string | null>(null);

  const contacts = contactsData?.contacts ?? [];
  const stages = useMemo(
    () =>
      [...(stagesData?.pipelineStages ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [stagesData],
  );
  const members = membersData?.members ?? [];

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.userId, m.fullName])),
    [members],
  );

  const columnMap = useMemo(() => {
    const map: Record<string, WaContact[]> = { __none__: [] };
    stages.forEach((s) => {
      map[s.id] = [];
    });
    contacts.forEach((c) => {
      const key = c.pipelineStageId ?? '__none__';
      if (map[key]) {
        map[key].push(c);
      } else {
        map['__none__'].push(c);
      }
    });
    return map;
  }, [contacts, stages]);

  function handleDragStart(contactId: string) {
    draggedContactId.current = contactId;
  }

  function handleMove(contactId: string, toStageId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    const currentStageId = contact?.pipelineStageId ?? '__none__';
    if (currentStageId === toStageId) return;

    const newStageId = toStageId === '__none__' ? null : toStageId;
    const stageName =
      toStageId === '__none__'
        ? t('leads.noStage')
        : (stages.find((s) => s.id === toStageId)?.name ?? toStageId);

    setPendingContactId(contactId);
    updateContact.mutate(
      { id: contactId, body: { pipelineStageId: newStageId } },
      {
        onSuccess: () => {
          toast.success(t('leads.moveSuccess', { stage: stageName }));
          setPendingContactId(null);
        },
        onError: (err) => {
          toast.error(err);
          setPendingContactId(null);
        },
      },
    );
    draggedContactId.current = null;
  }

  const isLoading = contactsLoading || stagesLoading;

  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/w/${ws.slug}/contacts`}>
            <KanbanSquare className="mr-1.5 size-3.5" />
            {t('contacts.title')}
          </Link>
        </Button>
      </div>

      {isLoading && <KanbanSkeleton />}

      {/* Empty board — no stages */}
      {!isLoading && stages.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-[#e4e4e7] py-16 text-center">
          <KanbanSquare className="size-10 text-[#a1a1aa]" />
          <div>
            <p className="text-[13px] font-medium text-[#18181b]">
              {t('leads.emptyBoard.title')}
            </p>
            <p className="text-[12px] text-[#71717a] mt-0.5">
              {t('leads.emptyBoard.body')}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/w/${ws.slug}/contacts`}>
              {t('leads.emptyBoard.cta')}
            </Link>
          </Button>
        </div>
      )}

      {/* Kanban board */}
      {!isLoading && stages.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stageId={stage.id}
              title={stage.name}
              contacts={columnMap[stage.id] ?? []}
              stages={stages}
              memberMap={memberMap}
              pendingContactId={pendingContactId}
              onDragStart={handleDragStart}
              onMove={handleMove}
            />
          ))}

          {(columnMap['__none__'] ?? []).length > 0 && (
            <KanbanColumn
              stageId="__none__"
              title={t('leads.noStage')}
              contacts={columnMap['__none__'] ?? []}
              stages={stages}
              memberMap={memberMap}
              pendingContactId={pendingContactId}
              onDragStart={handleDragStart}
              onMove={handleMove}
            />
          )}
        </div>
      )}
    </div>
  );
}
