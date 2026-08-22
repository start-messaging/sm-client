import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Download, KanbanSquare, Trash2, Users, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useContacts, useDeleteContact } from '@/api/hooks/use-contacts';
import { usePipelineStages } from '@/api/hooks/use-pipeline-stages';
import { useMembers } from '@/api/hooks/use-members';
import { type WaContact, type ContactSource } from '@/api/contacts.api';
import type { PipelineStage } from '@/api/messages.api';
import { toast } from '@/lib/toast';
import { AddContactDialog } from './components/add-contact-dialog';
import { ImportContactsDialog } from './components/import-contacts-dialog';

// ── Source badge ──────────────────────────────────────────────────────────────

const SOURCE_VARIANT: Record<
  ContactSource,
  'default' | 'secondary' | 'outline'
> = {
  whatsapp: 'default',
  manual: 'secondary',
  csv: 'outline',
  link: 'outline',
};

function SourceBadge({ source }: { source?: ContactSource }) {
  const { t } = useTranslation();
  if (!source) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge variant={SOURCE_VARIANT[source]} className="text-xs capitalize">
      {t(`contacts.source.${source}`)}
    </Badge>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCsv(contacts: WaContact[], stages: PipelineStage[]) {
  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));
  const header = [
    'Name',
    'Phone',
    'Email',
    'Tags',
    'Source',
    'Stage',
    'Opt-in',
    'Follow-up',
    'Added',
  ];
  const rows = contacts.map((c) => [
    c.name ?? '',
    c.phoneE164,
    c.email ?? '',
    c.tags.join(';'),
    c.source ?? '',
    c.pipelineStageId ? (stageMap[c.pipelineStageId] ?? '') : '',
    c.optedIn ? 'Yes' : 'No',
    c.followUpAt ?? '',
    c.createdAt,
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contacts.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Filters ───────────────────────────────────────────────────────────────────

type FollowUpFilter = '' | 'overdue' | 'upcoming';

/** Radix Select forbids empty-string item values. */
const ALL = '__all__';

function applyFilters(
  contacts: WaContact[],
  tagFilter: string,
  stageFilter: string,
  assigneeFilter: string,
  followUpFilter: FollowUpFilter,
): WaContact[] {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return contacts.filter((c) => {
    if (tagFilter && !c.tags.includes(tagFilter)) return false;
    if (stageFilter) {
      if (stageFilter === '__none__') {
        if (c.pipelineStageId) return false;
      } else {
        if (c.pipelineStageId !== stageFilter) return false;
      }
    }
    if (assigneeFilter) {
      if (assigneeFilter === '__unassigned__') {
        if (c.assignedToUserId) return false;
      } else {
        if (c.assignedToUserId !== assigneeFilter) return false;
      }
    }
    if (followUpFilter === 'overdue') {
      if (!c.followUpAt || new Date(c.followUpAt) >= now) return false;
    }
    if (followUpFilter === 'upcoming') {
      if (!c.followUpAt) return false;
      const d = new Date(c.followUpAt);
      if (d < now || d > nextWeek) return false;
    }
    return true;
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ContactsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useContacts(ws.slug);
  const { data: stagesData } = usePipelineStages(ws.slug);
  const { data: membersData } = useMembers(ws.slug, ws.id);
  const deleteContact = useDeleteContact(ws.slug);

  const [pendingDelete, setPendingDelete] = useState<WaContact | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>('');

  const contacts = data?.contacts ?? [];
  const stages = stagesData?.pipelineStages ?? [];
  const members = membersData?.members ?? [];

  const allTags = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [contacts]);

  const filtered = useMemo(
    () =>
      applyFilters(
        contacts,
        tagFilter,
        stageFilter,
        assigneeFilter,
        followUpFilter,
      ),
    [contacts, tagFilter, stageFilter, assigneeFilter, followUpFilter],
  );

  const hasActiveFilter =
    tagFilter !== '' ||
    stageFilter !== '' ||
    assigneeFilter !== '' ||
    followUpFilter !== '';

  const clearFilters = () => {
    setTagFilter('');
    setStageFilter('');
    setAssigneeFilter('');
    setFollowUpFilter('');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteContact.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t('contacts.delete.success'));
        setPendingDelete(null);
      },
      onError: (err) => {
        toast.error(err);
        setPendingDelete(null);
      },
    });
  };

  const stageMap = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s.name])),
    [stages],
  );
  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.userId, m.fullName])),
    [members],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('contacts.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('contacts.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/w/${ws.slug}/leads`}>
              <KanbanSquare className="mr-1.5 size-4" />
              {t('contacts.manageLeads')}
            </Link>
          </Button>
          {contacts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filtered, stages)}
            >
              <Download className="mr-1.5 size-4" />
              {t('contacts.export')}
            </Button>
          )}
          <ImportContactsDialog slug={ws.slug} />
          <AddContactDialog slug={ws.slug} />
        </div>
      </div>

      {/* Education slot */}
      <EducationSlot
        title={t('contacts.intro.title')}
        body={t('contacts.intro.body')}
      />

      {/* Loading */}
      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

      {/* Empty state */}
      {!isLoading && contacts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">{t('contacts.empty.title')}</p>
              <p className="text-muted-foreground text-sm">
                {t('contacts.empty.body')}
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <ImportContactsDialog slug={ws.slug} />
              <AddContactDialog slug={ws.slug} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + table */}
      {!isLoading && contacts.length > 0 && (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tag filter */}
            {allTags.length > 0 && (
              <Select
                value={tagFilter || ALL}
                onValueChange={(v) => setTagFilter(v === ALL ? '' : v)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder={t('contacts.filter.allTags')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('contacts.filter.allTags')}
                  </SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Stage filter */}
            {stages.length > 0 && (
              <Select
                value={stageFilter || ALL}
                onValueChange={(v) => setStageFilter(v === ALL ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder={t('contacts.filter.allStages')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('contacts.filter.allStages')}
                  </SelectItem>
                  <SelectItem value="__none__">{t('leads.noStage')}</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Assignee filter */}
            {members.length > 0 && (
              <Select
                value={assigneeFilter || ALL}
                onValueChange={(v) => setAssigneeFilter(v === ALL ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue
                    placeholder={t('contacts.filter.allAssignees')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('contacts.filter.allAssignees')}
                  </SelectItem>
                  <SelectItem value="__unassigned__">
                    {t('inbox.unassigned')}
                  </SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Follow-up filter */}
            <Select
              value={followUpFilter || ALL}
              onValueChange={(v) =>
                setFollowUpFilter(v === ALL ? '' : (v as FollowUpFilter))
              }
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder={t('contacts.filter.anyFollowUp')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t('contacts.filter.anyFollowUp')}
                </SelectItem>
                <SelectItem value="overdue">
                  {t('contacts.filter.overdue')}
                </SelectItem>
                <SelectItem value="upcoming">
                  {t('contacts.filter.upcoming')}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={clearFilters}
              >
                <X className="mr-1 size-3.5" />
                {t('contacts.filter.reset')}
              </Button>
            )}

            {/* Result count */}
            {hasActiveFilter && (
              <span className="text-muted-foreground ml-auto text-xs">
                {t('contacts.filter.resultsOf', {
                  count: filtered.length,
                  total: contacts.length,
                })}
              </span>
            )}
          </div>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('contacts.table.name')}</TableHead>
                  <TableHead>{t('contacts.table.phone')}</TableHead>
                  <TableHead>{t('contacts.table.source')}</TableHead>
                  <TableHead>{t('contacts.table.tags')}</TableHead>
                  <TableHead>{t('contacts.table.stage')}</TableHead>
                  <TableHead>{t('contacts.table.assignee')}</TableHead>
                  <TableHead>{t('contacts.table.followUp')}</TableHead>
                  <TableHead>{t('contacts.table.optIn')}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      {t('contacts.empty.title')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <ContactRow
                      key={c.id}
                      contact={c}
                      stageMap={stageMap}
                      memberMap={memberMap}
                      onDelete={() => setPendingDelete(c)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('contacts.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contacts.delete.body', {
                name: pendingDelete?.name ?? pendingDelete?.phoneE164 ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('contacts.delete.cta')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Contact row (extracted to avoid re-rendering the whole table) ─────────────

function ContactRow({
  contact: c,
  stageMap,
  memberMap,
  onDelete,
}: {
  contact: WaContact;
  stageMap: Record<string, string>;
  memberMap: Record<string, string>;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  const followUpDate = c.followUpAt ? new Date(c.followUpAt) : null;
  const isOverdue = followUpDate !== null && followUpDate < new Date();

  return (
    <TableRow
      className={
        isOverdue ? 'bg-destructive/5 hover:bg-destructive/10' : undefined
      }
    >
      <TableCell className="font-medium">
        {c.name ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="font-mono text-sm">{c.phoneE164}</TableCell>
      <TableCell>
        <SourceBadge source={c.source} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {c.tags.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            c.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        {c.pipelineStageId ? (
          <Badge variant="outline" className="text-xs">
            {stageMap[c.pipelineStageId] ?? c.pipelineStageId}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {c.assignedToUserId ? (
          (memberMap[c.assignedToUserId] ?? (
            <span className="text-muted-foreground">—</span>
          ))
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        {followUpDate ? (
          <Badge
            variant={isOverdue ? 'destructive' : 'outline'}
            className="text-xs"
          >
            {isOverdue && `${t('leads.card.overdue')} · `}
            {followUpDate.toLocaleDateString()}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={c.optedIn ? 'default' : 'outline'}>
          {c.optedIn ? t('inbox.rail.optedIn') : t('inbox.rail.notOptedIn')}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-8"
          aria-label={t('contacts.delete.cta')}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
