/**
 * Leads Kanban — contacts grouped by pipeline stage.
 * Stages are columns; each card shows name, phone, assignee, follow-up.
 * Moving a contact to a new stage calls PATCH /contacts/:id { pipelineStageId }.
 * No drag-and-drop library used; move is done via a Select per card.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarClock, KanbanSquare, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useContacts, useUpdateContact } from '@/api/hooks/use-contacts';
import { usePipelineStages } from '@/api/hooks/use-pipeline-stages';
import { useMembers } from '@/api/hooks/use-members';
import { type WaContact } from '@/api/contacts.api';
import type { PipelineStage } from '@/api/messages.api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null, phone: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

// ── Contact card ─────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: WaContact;
  stages: PipelineStage[];
  memberMap: Record<string, string>;
  slug: string;
}

function ContactCard({ contact: c, stages, memberMap, slug }: ContactCardProps) {
  const { t } = useTranslation();
  const updateContact = useUpdateContact(slug);

  const followUpDate = c.followUpAt ? new Date(c.followUpAt) : null;
  const now = new Date();
  const isOverdue = followUpDate !== null && followUpDate < now;

  function moveTo(stageId: string) {
    const newStageId = stageId === '__none__' ? null : stageId;
    const stageName =
      stageId === '__none__'
        ? t('leads.noStage')
        : (stages.find((s) => s.id === stageId)?.name ?? stageId);

    updateContact.mutate(
      { id: c.id, body: { pipelineStageId: newStageId } },
      {
        onSuccess: () => toast.success(t('leads.moveSuccess', { stage: stageName })),
        onError: (err) => toast.error(err),
      },
    );
  }

  const currentStageId = c.pipelineStageId ?? '__none__';

  return (
    <Card className="group relative text-sm shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start gap-2.5 space-y-0 p-3 pb-2">
        {/* Avatar */}
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {initials(c.name, c.phoneE164)}
        </div>
        {/* Name + phone */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">
            {c.name ?? (
              <span className="text-muted-foreground">{c.phoneE164}</span>
            )}
          </p>
          {c.name && (
            <p className="text-muted-foreground font-mono text-xs">
              {c.phoneE164}
            </p>
          )}
        </div>
        {/* Pending indicator */}
        {updateContact.isPending && (
          <Spinner className="size-3.5 shrink-0" />
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-1.5 p-3 pt-0">
        {/* Tags (first 2) */}
        {c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {c.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{c.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Assignee */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Users className="size-3" />
          <span>
            {c.assignedToUserId
              ? (memberMap[c.assignedToUserId] ?? t('leads.card.noAssignee'))
              : t('leads.card.noAssignee')}
          </span>
        </div>

        {/* Follow-up */}
        {followUpDate && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            <CalendarClock className="size-3" />
            {isOverdue && (
              <span className="font-medium">{t('leads.card.overdue')} · </span>
            )}
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
          onValueChange={moveTo}
          disabled={updateContact.isPending}
        >
          <SelectTrigger className="mt-1 h-7 text-xs">
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
      </CardContent>
    </Card>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  title: string;
  contacts: WaContact[];
  stages: PipelineStage[];
  memberMap: Record<string, string>;
  slug: string;
}

function KanbanColumn({ title, contacts, stages, memberMap, slug }: KanbanColumnProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {contacts.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {contacts.length === 0 ? (
          <div className="border-muted rounded-lg border border-dashed p-4 text-center">
            <p className="text-muted-foreground text-xs">
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
              slug={slug}
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
        <div key={i} className="flex w-72 shrink-0 flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LeadsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();

  const { data: contactsData, isLoading: contactsLoading } = useContacts(ws.slug);
  const { data: stagesData, isLoading: stagesLoading } = usePipelineStages(ws.slug);
  const { data: membersData } = useMembers(ws.slug, ws.id);

  const contacts = contactsData?.contacts ?? [];
  const stages = useMemo(
    () => [...(stagesData?.pipelineStages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [stagesData],
  );
  const members = membersData?.members ?? [];

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.userId, m.fullName])),
    [members],
  );

  // Group contacts by pipelineStageId; null → '__none__'
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

  const isLoading = contactsLoading || stagesLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('leads.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('leads.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/w/${ws.slug}/contacts`}>
            <KanbanSquare className="mr-1.5 size-4" />
            {t('contacts.title')}
          </Link>
        </Button>
      </div>

      {/* Education slot */}
      <EducationSlot
        title={t('leads.intro.title')}
        body={t('leads.intro.body')}
      />

      {/* Loading */}
      {isLoading && <KanbanSkeleton />}

      {/* Empty board — no stages yet */}
      {!isLoading && stages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <KanbanSquare className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">{t('leads.emptyBoard.title')}</p>
              <p className="text-muted-foreground text-sm">
                {t('leads.emptyBoard.body')}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/w/${ws.slug}/contacts`}>
                {t('leads.emptyBoard.cta')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Kanban board */}
      {!isLoading && stages.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Pipeline stage columns */}
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              title={stage.name}
              contacts={columnMap[stage.id] ?? []}
              stages={stages}
              memberMap={memberMap}
              slug={ws.slug}
            />
          ))}

          {/* "No stage" column — always last */}
          {(columnMap['__none__'] ?? []).length > 0 && (
            <KanbanColumn
              title={t('leads.noStage')}
              contacts={columnMap['__none__'] ?? []}
              stages={stages}
              memberMap={memberMap}
              slug={ws.slug}
            />
          )}
        </div>
      )}
    </div>
  );
}
