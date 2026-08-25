import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Download, KanbanSquare, Search, Trash2, Users, X } from 'lucide-react';
import { InfoTip } from '@/components/shared/info-tip';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useQueryParam } from '@/hooks/use-query-param';
import { useContacts, useDeleteContact } from '@/api/hooks/use-contacts';
import { usePipelineStages } from '@/api/hooks/use-pipeline-stages';
import { useMembers } from '@/api/hooks/use-members';
import { type WaContact, type ContactSource } from '@/api/contacts.api';
import type { PipelineStage } from '@/api/messages.api';
import { toast } from '@/lib/toast';
import { AddContactDialog } from './components/add-contact-dialog';
import { ImportContactsDialog } from './components/import-contacts-dialog';

// ── Source pill ───────────────────────────────────────────────────────────────

const SOURCE_STYLE: Record<ContactSource, { bg: string; text: string }> = {
  whatsapp: { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]' },
  manual: { bg: 'bg-[#f4f4f5]', text: 'text-[#71717a]' },
  csv: { bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]' },
  link: { bg: 'bg-[#ede9fe]', text: 'text-[#7c3aed]' },
};

function SourcePill({ source }: { source?: ContactSource }) {
  const { t } = useTranslation();
  if (!source) return <span className="text-[12px] text-[#a1a1aa]">—</span>;
  const { bg, text } = SOURCE_STYLE[source];
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-[6px] py-px rounded-full capitalize',
        bg,
        text,
      )}
    >
      {t(`contacts.source.${source}`)}
    </span>
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
  const {
    value: searchValue,
    debouncedValue: searchTerm,
    setValue: setSearchValue,
  } = useQueryParam('search');
  const { data, isLoading } = useContacts(ws.slug, searchTerm || undefined);
  const { data: stagesData } = usePipelineStages(ws.slug);
  const { data: membersData } = useMembers(ws.slug, ws.id);
  const deleteContact = useDeleteContact(ws.slug);

  const [pendingDelete, setPendingDelete] = useState<WaContact | null>(null);
  const [tabFilter, setTabFilter] = useState<'all' | 'opted_out'>('all');
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

  const baseContacts = useMemo(
    () =>
      tabFilter === 'opted_out' ? contacts.filter((c) => !c.optedIn) : contacts,
    [contacts, tabFilter],
  );

  const filtered = useMemo(
    () =>
      applyFilters(
        baseContacts,
        tagFilter,
        stageFilter,
        assigneeFilter,
        followUpFilter,
      ),
    [baseContacts, tagFilter, stageFilter, assigneeFilter, followUpFilter],
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
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          {contacts.length > 0 && (
            <span className="text-[13px] text-[#a1a1aa]">
              {contacts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/w/${ws.slug}/leads`}>
              <KanbanSquare className="mr-1.5 size-3.5" />
              {t('contacts.manageLeads')}
            </Link>
          </Button>
          {contacts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filtered, stages)}
            >
              <Download className="mr-1.5 size-3.5" />
              {t('contacts.export')}
            </Button>
          )}
          <ImportContactsDialog slug={ws.slug} />
          <AddContactDialog slug={ws.slug} />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#a1a1aa]" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t('contacts.filter.search')}
          className="pl-8 bg-[#f4f4f5] border-transparent focus-visible:bg-white focus-visible:border-[#e4e4e7]"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

      {/* Empty state */}
      {!isLoading && contacts.length === 0 && !searchTerm && (
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

      {/* No search results */}
      {!isLoading && contacts.length === 0 && searchTerm && (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            {t('contacts.filter.noResults', { term: searchTerm })}
          </CardContent>
        </Card>
      )}

      {/* Filters + table */}
      {!isLoading && contacts.length > 0 && (
        <>
          {/* Tab pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTabFilter('all')}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
                tabFilter === 'all'
                  ? 'bg-[#18181b] text-white'
                  : 'bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]',
              )}
            >
              {t('inbox.tabs.all')}
            </button>
            <button
              onClick={() => setTabFilter('opted_out')}
              className={cn(
                'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
                tabFilter === 'opted_out'
                  ? 'bg-[#18181b] text-white'
                  : 'bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]',
              )}
            >
              {t('contacts.tabs.opted_out')}
              <InfoTip content={t('contacts.opted_out_tip')} />
            </button>
          </div>

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
                      {tabFilter === 'opted_out'
                        ? t('contacts.empty_opted_out')
                        : t('contacts.empty.title')}
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
    <TableRow className={isOverdue ? 'bg-[#fee2e2]/30' : undefined}>
      <TableCell className="text-[13px] font-medium text-[#18181b]">
        <div className="flex flex-wrap items-center gap-1.5">
          {c.name ?? <span className="text-[#a1a1aa]">—</span>}
          {!c.optedIn && (
            <span className="text-[10px] font-semibold px-[6px] py-px rounded-full bg-[#fef3c7] text-[#d97706]">
              {t('contacts.opted_out_badge')}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-[12px] text-[#71717a]">
        {c.phoneE164}
      </TableCell>
      <TableCell>
        <SourcePill source={c.source} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {c.tags.length === 0 ? (
            <span className="text-[12px] text-[#a1a1aa]">—</span>
          ) : (
            c.tags.map((tag) => (
              <span
                key={tag}
                className="bg-[#f4f4f5] text-[#18181b] text-[11px] font-medium px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        {c.pipelineStageId ? (
          <span className="border border-[#e4e4e7] text-[#71717a] text-[11px] px-[6px] py-px rounded-full">
            {stageMap[c.pipelineStageId] ?? c.pipelineStageId}
          </span>
        ) : (
          <span className="text-[12px] text-[#a1a1aa]">—</span>
        )}
      </TableCell>
      <TableCell className="text-[13px] text-[#71717a]">
        {c.assignedToUserId ? (
          (memberMap[c.assignedToUserId] ?? (
            <span className="text-[#a1a1aa]">—</span>
          ))
        ) : (
          <span className="text-[#a1a1aa]">—</span>
        )}
      </TableCell>
      <TableCell>
        {followUpDate ? (
          <span
            className={cn(
              'text-[11px] font-medium px-[6px] py-px rounded-full',
              isOverdue
                ? 'bg-[#fee2e2] text-[#dc2626]'
                : 'border border-[#e4e4e7] text-[#71717a]',
            )}
          >
            {isOverdue && `${t('leads.card.overdue')} · `}
            {followUpDate.toLocaleDateString()}
          </span>
        ) : (
          <span className="text-[12px] text-[#a1a1aa]">—</span>
        )}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'text-[11px] font-medium px-[6px] py-px rounded-full',
            c.optedIn
              ? 'bg-[#dcfce7] text-[#16a34a]'
              : 'bg-[#f4f4f5] text-[#71717a]',
          )}
        >
          {c.optedIn ? t('inbox.rail.optedIn') : t('inbox.rail.notOptedIn')}
        </span>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#a1a1aa] hover:text-[#dc2626] size-8"
          aria-label={t('contacts.delete.cta')}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
