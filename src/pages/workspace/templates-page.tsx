import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutTemplate, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useTemplates,
  useSyncTemplates,
  useDeleteTemplate,
} from '@/api/hooks/use-templates';
import { useResolvedTemplateExamples } from '@/api/hooks/use-template-examples';
import { toast } from '@/lib/toast';
import type { TemplateStatus, WaTemplate } from '@/api/templates.api';
import { exampleBodyPreview, featuredExamples } from '@/lib/template-examples';

const STATUS_VARIANT: Record<
  TemplateStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  APPROVED: 'default',
  PENDING: 'secondary',
  REJECTED: 'destructive',
  PAUSED: 'outline',
  DISABLED: 'outline',
};

const STATUS_ORDER: Record<TemplateStatus, number> = {
  APPROVED: 0,
  PENDING: 1,
  PAUSED: 2,
  REJECTED: 3,
  DISABLED: 4,
};

const FILTER_ALL = '__all__';

const META_BUSINESS_SUPPORT_HOME =
  'https://business.facebook.com/latest/business_support_home';

function wasRecategorized(tpl: WaTemplate): boolean {
  return Boolean(
    tpl.submittedCategory && tpl.submittedCategory !== tpl.category,
  );
}

function hasPendingCategoryChange(tpl: WaTemplate): boolean {
  return Boolean(tpl.correctCategory && tpl.correctCategory !== tpl.category);
}
const SYNC_TTL_MS = 2 * 60 * 1000;

function rejectionLabel(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  reason: string,
): string {
  const key = `templates.rejection.${reason}`;
  const translated = t(key, { defaultValue: '' });
  return translated || reason;
}

function editPath(slug: string, tpl: WaTemplate): string {
  if (tpl.status === 'APPROVED') {
    return `/w/${slug}/templates/new?from=${encodeURIComponent(tpl.id)}`;
  }
  return `/w/${slug}/templates/${tpl.id}/edit`;
}

export function TemplatesPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useTemplates(ws.slug);
  const examples = useResolvedTemplateExamples(ws.slug);
  const featured = featuredExamples(examples, 4);
  const syncTemplates = useSyncTemplates(ws.slug);
  const deleteTemplate = useDeleteTemplate(ws.slug);
  const [manualSyncing, setManualSyncing] = useState(false);
  const autoSynced = useRef(false);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);

  const templates = data?.templates ?? [];
  const recategorized = templates.filter(wasRecategorized);
  const pendingCategory = templates.filter(hasPendingCategoryChange);
  const hasPending = templates.some((tpl) => tpl.status === 'PENDING');
  const approvedCount = templates.filter(
    (tpl) => tpl.status === 'APPROVED',
  ).length;

  const visible = useMemo(() => {
    const filtered =
      statusFilter === FILTER_ALL
        ? templates
        : templates.filter((tpl) => tpl.status === statusFilter);
    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    );
  }, [templates, statusFilter]);

  useEffect(() => {
    if (!ws.slug || autoSynced.current || isLoading) return;
    if (!hasPending) return;

    const key = `wa:tpl-sync:${ws.slug}`;
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < SYNC_TTL_MS) return;

    autoSynced.current = true;
    sessionStorage.setItem(key, String(Date.now()));
    syncTemplates.mutate(undefined, {
      onError: () => {
        // Silent on auto-sync — manual Sync still available.
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.slug, isLoading, hasPending]);

  function handleSync() {
    setManualSyncing(true);
    syncTemplates.mutate(undefined, {
      onSuccess: () => {
        sessionStorage.setItem(`wa:tpl-sync:${ws.slug}`, String(Date.now()));
        toast.success(t('templates.syncSuccess'));
      },
      onError: (err) => toast.error(err),
      onSettled: () => setManualSyncing(false),
    });
  }

  function handleDelete(tpl: WaTemplate) {
    deleteTemplate.mutate(tpl.id, {
      onSuccess: () => toast.success(t('templates.deleteSuccess')),
      onError: (err) => toast.error(err),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('templates.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('templates.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={manualSyncing}
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${manualSyncing ? 'animate-spin' : ''}`}
            />
            {t('templates.syncCta')}
          </Button>
          <Button size="sm" asChild>
            <Link to={`/w/${ws.slug}/templates/new`}>
              <Plus className="mr-1.5 size-3.5" />
              {t('templates.createCta')}
            </Link>
          </Button>
        </div>
      </div>

      <EducationSlot
        title={t('templates.intro.title')}
        body={t('templates.intro.body')}
        docsUrl="https://developers.facebook.com/docs/whatsapp/message-templates"
        storageKey="templates-intro"
      />

      {recategorized.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="text-sm font-medium">
            {t('templates.recategorized.bannerTitle', {
              count: recategorized.length,
            })}
          </p>
          <p className="text-sm opacity-90">
            {t('templates.recategorized.bannerBody')}
          </p>
          <a
            href={META_BUSINESS_SUPPORT_HOME}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {t('templates.recategorized.cta')}
          </a>
        </div>
      )}

      {pendingCategory.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="text-sm font-medium">
            {t('templates.recategorized.pendingTitle', {
              count: pendingCategory.length,
            })}
          </p>
          <p className="text-sm opacity-90">
            {t('templates.recategorized.pendingBody')}
          </p>
        </div>
      )}

      {featured.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">
                {t('templates.featured.title')}
              </h2>
              <p className="text-muted-foreground text-xs">
                {t('templates.featured.subtitle')}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/w/${ws.slug}/templates/samples`}>
                {t('templates.featured.more')}
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((example) => (
              <Link
                key={example.id}
                to={`/w/${ws.slug}/templates/new?example=${encodeURIComponent(example.id)}`}
                className="hover:bg-muted/40 flex flex-col gap-2 rounded-lg border p-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-mono text-sm font-medium">
                    {example.suggestedName}
                  </p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {example.category}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                  {exampleBodyPreview(example)}
                </p>
                <span className="text-xs font-medium">
                  {t('templates.examples.apply')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{t('templates.yours.title')}</h2>
          {templates.length > 0 && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>
                  {t('templates.yours.filterAll')}
                </SelectItem>
                <SelectItem value="APPROVED">
                  {t('templates.status.APPROVED')}
                </SelectItem>
                <SelectItem value="PENDING">
                  {t('templates.status.PENDING')}
                </SelectItem>
                <SelectItem value="REJECTED">
                  {t('templates.status.REJECTED')}
                </SelectItem>
                <SelectItem value="PAUSED">
                  {t('templates.status.PAUSED')}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading && (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        )}

        {!isLoading && templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <LayoutTemplate className="text-muted-foreground size-10" />
              <div>
                <p className="font-medium">{t('templates.empty.title')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('templates.empty.body')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/w/${ws.slug}/templates/samples`}>
                    {t('templates.featured.useSample')}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/w/${ws.slug}/templates/new`}>
                    {t('templates.featured.fromScratch')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && templates.length > 0 && approvedCount === 0 && (
          <p className="text-muted-foreground text-xs">
            {t('templates.yours.noApproved')}
          </p>
        )}

        {!isLoading && templates.length > 0 && visible.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {t('templates.yours.emptyFilter')}
          </p>
        )}

        {!isLoading && visible.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('templates.table.name')}</TableHead>
                  <TableHead>{t('templates.table.category')}</TableHead>
                  <TableHead>{t('templates.table.language')}</TableHead>
                  <TableHead>{t('templates.table.status')}</TableHead>
                  <TableHead className="w-[88px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-sm">{tpl.name}</span>
                        {tpl.status === 'REJECTED' && tpl.rejectionReason && (
                          <span className="text-destructive text-xs">
                            {rejectionLabel(t, tpl.rejectionReason)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline">{tpl.category}</Badge>
                        {wasRecategorized(tpl) && (
                          <span className="text-amber-800 dark:text-amber-200 text-xs">
                            {t('templates.recategorized.row', {
                              from: tpl.submittedCategory,
                              to: tpl.category,
                            })}
                          </span>
                        )}
                        {hasPendingCategoryChange(tpl) && (
                          <span className="text-amber-800 dark:text-amber-200 text-xs">
                            {t('templates.recategorized.pendingRow', {
                              from: tpl.category,
                              to: tpl.correctCategory,
                            })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {tpl.language}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[tpl.status]}>
                        {t(`templates.status.${tpl.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          asChild
                        >
                          <Link
                            to={editPath(ws.slug, tpl)}
                            aria-label={t('templates.editCta')}
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              disabled={deleteTemplate.isPending}
                              aria-label={t('templates.deleteCta')}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t('templates.deleteTitle')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('templates.deleteBody', { name: tpl.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t('common.cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(tpl)}
                              >
                                {t('templates.deleteCta')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}
