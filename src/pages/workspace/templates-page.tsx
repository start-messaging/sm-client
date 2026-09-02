import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutTemplate,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { InfoTip } from '@/components/shared/info-tip';
import { hydrateTemplate } from '@/lib/template-utils';
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
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useTemplates,
  useSyncTemplates,
  useDeleteTemplate,
} from '@/api/hooks/use-templates';
import { useResolvedTemplateExamples } from '@/api/hooks/use-template-examples';
import { toast } from '@/lib/toast';
import type { TemplateStatus, WaTemplate } from '@/api/templates.api';
import { exampleBodyPreview, featuredExamples } from '@/api/template-examples.api';
import { cn } from '@/lib/utils';
import { TemplatePreviewPopover } from '@/components/whatsapp/template-preview-popover';
import {
  TemplatePreviewButtons,
  TemplatePreviewMedia,
} from '@/components/whatsapp/template-preview-buttons';

const STATUS_PILL: Record<TemplateStatus, { bg: string; text: string }> = {
  APPROVED: { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]' },
  PENDING: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
  REJECTED: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]' },
  PAUSED: { bg: 'bg-[#f4f4f5]', text: 'text-[#71717a]' },
  DISABLED: { bg: 'bg-[#f4f4f5]', text: 'text-[#71717a]' },
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

function templateActions(tpl: WaTemplate): string {
  const buttons = tpl.buttons?.length
    ? tpl.buttons
    : (tpl.components.find((c) => c.type === 'BUTTONS')?.buttons ?? []);
  if (!buttons.length) return '—';
  return buttons
    .map((b) => b.text || b.type.replaceAll('_', ' '))
    .filter(Boolean)
    .join(', ');
}

function TemplateBubble({ tpl }: { tpl: WaTemplate }) {
  const header = tpl.components.find((c) => c.type === 'HEADER');
  const footer = tpl.components.find((c) => c.type === 'FOOTER');
  const buttons = tpl.components.find((c) => c.type === 'BUTTONS');
  const body = hydrateTemplate(tpl.components);
  const handle = header?.example?.header_handle?.[0];
  const mediaUrl =
    header?.link || (handle?.startsWith('http') ? handle : undefined);

  return (
    <div className="rounded-lg bg-[#d9fdd3] p-3 text-sm shadow-sm space-y-1.5 min-h-[140px]">
      {header?.format && header.format !== 'TEXT' && (
        <TemplatePreviewMedia
          format={header.format}
          url={mediaUrl}
          compact
        />
      )}
      {header?.format === 'TEXT' && header.text && (
        <p className="font-semibold text-[#111b21] text-[13px]">{header.text}</p>
      )}
      {body ? (
        <p className="text-[#111b21] whitespace-pre-wrap text-[12px] line-clamp-5">
          {body}
        </p>
      ) : (
        <p className="text-[12px] italic text-[#667781]">—</p>
      )}
      {footer?.text && (
        <p className="text-[11px] text-[#667781]">{footer.text}</p>
      )}
      {buttons?.buttons && buttons.buttons.length > 0 && (
        <TemplatePreviewButtons buttons={buttons.buttons} compact />
      )}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: TemplateStatus }) {
  const { t } = useTranslation();
  const { bg, text } = STATUS_PILL[status];
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-[6px] py-px rounded-full',
        bg,
        text,
      )}
    >
      {t(`templates.status.${status}`)}
    </span>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-[11px] text-[#71717a] flex items-center gap-1 shrink-0">
        {label}
        {hint && <InfoTip content={hint} />}
      </span>
      <span className="text-[12px] text-[#18181b] text-right break-all">
        {value}
      </span>
    </div>
  );
}

function TemplateCard({
  tpl,
  slug,
  onDelete,
}: {
  tpl: WaTemplate;
  slug: string;
  onDelete: (t: WaTemplate) => void;
}) {
  const { t } = useTranslation();
  const recategorized = wasRecategorized(tpl);
  const pendingCat = hasPendingCategoryChange(tpl);
  const quality = tpl.qualityScore ?? '—';
  const analyticsHint = t('templates.list.analyticsHint');

  const deliveryRate =
    tpl.metaSentCount && tpl.metaDeliveredCount != null
      ? `${Math.round((tpl.metaDeliveredCount / tpl.metaSentCount) * 100)}%`
      : '—';
  const readRate =
    tpl.metaSentCount && tpl.metaReadCount != null
      ? `${Math.round((tpl.metaReadCount / tpl.metaSentCount) * 100)}%`
      : '—';
  const blockReason = tpl.topBlockReason
    ? tpl.topBlockReason.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
    : '—';

  return (
    <div className="flex flex-col md:flex-row bg-white border border-[#e4e4e7] rounded-[12px] overflow-hidden hover:shadow-sm transition-shadow">
      <div className="md:w-[280px] shrink-0 p-3 bg-[#ece5dd]">
        <TemplateBubble tpl={tpl} />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex flex-col gap-1 p-4 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[14px] font-semibold text-[#18181b] truncate">
              {tpl.name}
            </p>
            <StatusPill status={tpl.status} />
          </div>
          <DetailRow label={t('templates.table.category')} value={tpl.category} />
          <DetailRow
            label={t('templates.list.actions')}
            value={templateActions(tpl)}
          />
          <DetailRow label={t('templates.table.language')} value={tpl.language} />
          <DetailRow
            label={t('templates.table.status')}
            value={t(`templates.status.${tpl.status}`)}
          />
          <DetailRow
            label={t('templates.list.quality')}
            value={quality}
            hint={analyticsHint}
          />
          <DetailRow
            label={t('templates.list.delivery')}
            value={deliveryRate}
            hint={deliveryRate === '—' ? analyticsHint : undefined}
          />
          <DetailRow
            label={t('templates.list.readRate')}
            value={readRate}
            hint={readRate === '—' ? analyticsHint : undefined}
          />
          <DetailRow
            label={t('templates.list.topBlock')}
            value={blockReason}
            hint={blockReason === '—' ? analyticsHint : undefined}
          />
          {tpl.status === 'REJECTED' && tpl.rejectionReason && (
            <p className="text-[11px] text-[#dc2626] pt-1">
              {rejectionLabel(t, tpl.rejectionReason)}
            </p>
          )}
        </div>

      {/* Recategorization strip */}
      {(recategorized || pendingCat) && (
        <div className="border-t border-[#fcd34d] bg-[#fef9c3] px-3 py-1.5">
          <p className="text-[11px] text-[#92400e]">
            {recategorized
              ? t('templates.recategorized.row', {
                  from: tpl.submittedCategory,
                  to: tpl.category,
                })
              : t('templates.recategorized.pendingRow', {
                  from: tpl.category,
                  to: tpl.correctCategory,
                })}
          </p>
        </div>
      )}

      {/* Actions footer */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-[#e4e4e7] bg-[#fafafa]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-[#71717a] hover:text-[#18181b]"
          asChild
        >
          <Link to={editPath(slug, tpl)} aria-label={t('templates.editCta')}>
            <Pencil className="size-3.5" />
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-[#71717a] hover:text-[#dc2626]"
              aria-label={t('templates.deleteCta')}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('templates.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('templates.deleteBody', { name: tpl.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(tpl)}>
                {t('templates.deleteCta')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
  const [categoryFilter, setCategoryFilter] = useState<string>(FILTER_ALL);
  const [languageFilter, setLanguageFilter] = useState<string>(FILTER_ALL);
  const [qualityFilter, setQualityFilter] = useState<string>(FILTER_ALL);

  const templates = data?.templates ?? [];
  const recategorized = templates.filter(wasRecategorized);
  const pendingCategory = templates.filter(hasPendingCategoryChange);
  const hasPending = templates.some((tpl) => tpl.status === 'PENDING');
  const approvedCount = templates.filter(
    (tpl) => tpl.status === 'APPROVED',
  ).length;

  const languages = useMemo(
    () => [...new Set(templates.map((tpl) => tpl.language))].sort(),
    [templates],
  );

  const visible = useMemo(() => {
    const filtered = templates.filter((tpl) => {
      if (statusFilter !== FILTER_ALL && tpl.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== FILTER_ALL && tpl.category !== categoryFilter) {
        return false;
      }
      if (languageFilter !== FILTER_ALL && tpl.language !== languageFilter) {
        return false;
      }
      if (qualityFilter !== FILTER_ALL && (tpl.qualityScore ?? '') !== qualityFilter) {
        return false;
      }
      return true;
    });
    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    );
  }, [templates, statusFilter, categoryFilter, languageFilter, qualityFilter]);

  useEffect(() => {
    if (!ws.slug || autoSynced.current || isLoading) return;
    if (!hasPending) return;
    const key = `wa:tpl-sync:${ws.slug}`;
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < SYNC_TTL_MS) return;
    autoSynced.current = true;
    sessionStorage.setItem(key, String(Date.now()));
    syncTemplates.mutate(undefined, { onError: () => {} });
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
      {/* Action bar */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={manualSyncing}
        >
          <RefreshCw
            className={cn('mr-1.5 size-3.5', manualSyncing && 'animate-spin')}
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

      {/* WABA-level alerts */}
      {recategorized.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-[#fcd34d] bg-[#fef9c3] p-4 text-[#92400e]">
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
        <div className="flex flex-col gap-2 rounded-lg border border-[#fcd34d] bg-[#fef9c3] p-4 text-[#92400e]">
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

      {/* Sample templates */}
      {featured.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-semibold text-[#18181b]">
                {t('templates.featured.title')}
              </h2>
              <p className="text-[12px] text-[#71717a]">
                {t('templates.featured.subtitle')}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/w/${ws.slug}/templates/samples`}>
                {t('templates.featured.more')}
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((example) => (
              <TemplatePreviewPopover key={example.id} components={example.components}>
                <Link
                  to={`/w/${ws.slug}/templates/new?example=${encodeURIComponent(example.id)}`}
                  className="flex flex-col gap-2 rounded-[10px] border border-[#e4e4e7] bg-white p-4 hover:bg-[#fafafa] transition-colors"
                >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-mono text-[13px] font-medium text-[#18181b]">
                    {example.suggestedName}
                  </p>
                  <span className="border border-[#e4e4e7] text-[#71717a] text-[10px] px-[6px] py-px rounded-full shrink-0">
                    {example.category}
                  </span>
                </div>
                <p className="text-[12px] text-[#71717a] line-clamp-2 leading-relaxed flex-1">
                  {exampleBodyPreview(example)}
                </p>
                <span className="text-[12px] font-medium text-[#18181b]">
                  {t('templates.examples.apply')}
                </span>
                </Link>
              </TemplatePreviewPopover>
            ))}
          </div>
        </section>
      )}

      {/* Your templates */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[13px] font-semibold text-[#18181b]">
              {t('templates.yours.title')}
            </h2>
            {templates.length > 0 && (
              <span className="text-[12px] text-[#a1a1aa]">
                {templates.length}
              </span>
            )}
          </div>
          {templates.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder={t('templates.yours.filterCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>
                    {t('templates.yours.filterCategory')}
                  </SelectItem>
                  <SelectItem value="UTILITY">UTILITY</SelectItem>
                  <SelectItem value="MARKETING">MARKETING</SelectItem>
                  <SelectItem value="AUTHENTICATION">AUTHENTICATION</SelectItem>
                </SelectContent>
              </Select>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder={t('templates.yours.filterLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>
                    {t('templates.yours.filterLanguage')}
                  </SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
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
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder={t('templates.yours.filterQuality')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>
                    {t('templates.yours.filterQuality')}
                  </SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-[10px] border border-[#e4e4e7] bg-[#f4f4f5] animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <LayoutTemplate className="text-[#a1a1aa] size-10" />
              <div>
                <p className="font-medium text-[#18181b]">
                  {t('templates.empty.title')}
                </p>
                <p className="text-[13px] text-[#71717a] mt-0.5">
                  {t('templates.empty.body')}
                </p>
              </div>
              <div className="flex gap-2 mt-1">
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
          <p className="text-[12px] text-[#71717a]">
            {t('templates.yours.noApproved')}
          </p>
        )}

        {!isLoading && templates.length > 0 && visible.length === 0 && (
          <p className="text-[13px] text-[#71717a]">
            {t('templates.yours.emptyFilter')}
          </p>
        )}

        {!isLoading && visible.length > 0 && (
          <div className="flex flex-col gap-3">
            {visible.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                slug={ws.slug}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
