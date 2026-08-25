import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Megaphone, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useCampaigns,
  useDuplicateCampaign,
  useLaunchCampaign,
  usePauseCampaign,
  useResumeCampaign,
} from '@/api/hooks/use-campaigns';
import { useWabaStatus } from '@/api/hooks/use-whatsapp';
import { toast } from '@/lib/toast';
import { STATUS_PILL } from './components/campaign-status';
import type { Campaign, CampaignStatus } from '@/api/campaigns.api';
import { cn } from '@/lib/utils';

const META_MANAGER_URL =
  'https://business.facebook.com/latest/whatsapp_manager/payment_methods';

type StatusTab = 'ALL' | CampaignStatus;

const STATUS_TABS: StatusTab[] = [
  'ALL',
  'RUNNING',
  'DRAFT',
  'SCHEDULED',
  'PAUSED',
  'COMPLETED',
  'FAILED',
];

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: CampaignStatus }) {
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
      {t(`campaigns.status.${status}`)}
    </span>
  );
}

// ── Delivery stat cell ────────────────────────────────────────────────────────

function StatCell({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="text-right">
      <span className="text-[13px] tabular-nums text-[#18181b]">{value}</span>
      {total > 0 && (
        <span className="ml-1 text-[11px] text-[#a1a1aa]">{pct}%</span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CampaignsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ws = useCurrentWorkspace();

  const { data, isLoading } = useCampaigns(ws.slug);
  const { data: wabaStatus } = useWabaStatus(ws.slug);

  const launchMutation = useLaunchCampaign(ws.slug);
  const pauseMutation = usePauseCampaign(ws.slug);
  const resumeMutation = useResumeCampaign(ws.slug);
  const duplicateMutation = useDuplicateCampaign(ws.slug);

  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');

  const campaigns = data?.campaigns ?? [];
  const launchBlocked = wabaStatus?.metaPaymentReady === false;
  const createPath = `/w/${ws.slug}/campaigns/new`;

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<StatusTab, number>> = {
      ALL: campaigns.length,
    };
    for (const c of campaigns) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [campaigns]);

  const visible = useMemo(
    () =>
      activeTab === 'ALL'
        ? campaigns
        : campaigns.filter((c) => c.status === activeTab),
    [campaigns, activeTab],
  );

  function handleLaunch(id: string) {
    launchMutation.mutate(id, {
      onSuccess: () => toast.success(t('campaigns.launched')),
      onError: (err) => toast.error(err),
    });
  }

  function handlePause(id: string) {
    pauseMutation.mutate(id, {
      onSuccess: () => toast.success(t('campaigns.paused')),
      onError: (err) => toast.error(err),
    });
  }

  function handleResume(id: string) {
    resumeMutation.mutate(id, {
      onSuccess: () => toast.success(t('campaigns.resumed')),
      onError: (err) => toast.error(err),
    });
  }

  function handleDuplicate(id: string) {
    duplicateMutation.mutate(id, {
      onSuccess: () => toast.success(t('campaigns.duplicated')),
      onError: (err) => toast.error(err),
    });
  }

  function actionPending(c: Campaign): boolean {
    return (
      (launchMutation.isPending && launchMutation.variables === c.id) ||
      (pauseMutation.isPending && pauseMutation.variables === c.id) ||
      (resumeMutation.isPending && resumeMutation.variables === c.id) ||
      (duplicateMutation.isPending && duplicateMutation.variables === c.id)
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Button size="sm" asChild>
          <Link to={createPath}>
            <Plus className="mr-1.5 size-3.5" />
            {t('campaigns.createCta')}
          </Link>
        </Button>
      </div>

      {/* Payment blocked banner */}
      {launchBlocked && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-[#fcd34d] bg-[#fef9c3] p-4">
          <p className="text-[13px] font-semibold text-[#92400e]">
            {t('education.META_PAYMENT_REQUIRED.title')}
          </p>
          <p className="text-[12px] text-[#92400e]/80">
            {t('education.META_PAYMENT_REQUIRED.body')}
          </p>
          <p className="text-[11px] text-[#92400e]/60">
            {t('education.META_PAYMENT_REQUIRED.note')}
          </p>
          <div className="mt-1">
            <Button variant="outline" size="sm" asChild>
              <a
                href={META_MANAGER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                {t('education.META_PAYMENT_REQUIRED.cta')}
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <p className="text-[13px] text-[#71717a] flex items-center gap-2">
          <Spinner className="size-4" />
          {t('common.loading')}
        </p>
      )}

      {/* Empty state */}
      {!isLoading && campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Megaphone className="text-[#a1a1aa] size-10" />
            <div>
              <p className="font-medium text-[#18181b]">
                {t('campaigns.empty.title')}
              </p>
              <p className="text-[13px] text-[#71717a] mt-0.5">
                {t('campaigns.empty.body')}
              </p>
            </div>
            <Button size="sm" asChild>
              <Link to={createPath}>{t('campaigns.createCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table with status tabs */}
      {!isLoading && campaigns.length > 0 && (
        <div className="rounded-[10px] border border-[#e4e4e7] bg-white overflow-hidden">
          {/* Status tabs */}
          <div className="flex border-b border-[#e4e4e7] overflow-x-auto">
            {STATUS_TABS.filter(
              (tab) => tab === 'ALL' || (tabCounts[tab] ?? 0) > 0,
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  activeTab === tab
                    ? 'border-[#18181b] text-[#18181b]'
                    : 'border-transparent text-[#71717a] hover:text-[#18181b]',
                )}
              >
                {tab === 'ALL'
                  ? t('campaigns.tabs.all', 'All')
                  : t(`campaigns.status.${tab}`)}
                {(tabCounts[tab] ?? 0) > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-[5px] py-px rounded-full',
                      activeTab === tab
                        ? 'bg-[#18181b] text-white'
                        : 'bg-[#f4f4f5] text-[#71717a]',
                    )}
                  >
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow className="bg-[#fafafa]">
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.name')}
                </TableHead>
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.template')}
                </TableHead>
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.status')}
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.sent')}
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.delivered')}
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.read')}
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium text-[#a1a1aa]">
                  {t('campaigns.table.failed')}
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-[13px] text-[#a1a1aa]"
                  >
                    {t('campaigns.tabs.empty', 'No campaigns in this status')}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((c) => {
                  const pending = actionPending(c);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-[#fafafa]"
                      onClick={() =>
                        navigate(`/w/${ws.slug}/campaigns/${c.id}`)
                      }
                    >
                      <TableCell className="text-[13px] font-medium text-[#18181b]">
                        {c.name}
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-[#71717a]">
                        {c.templateName}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={c.status} />
                      </TableCell>
                      <TableCell>
                        <StatCell value={c.stats.sent} total={c.stats.total} />
                      </TableCell>
                      <TableCell>
                        <StatCell
                          value={c.stats.delivered}
                          total={c.stats.total}
                        />
                      </TableCell>
                      <TableCell>
                        <StatCell value={c.stats.read} total={c.stats.total} />
                      </TableCell>
                      <TableCell>
                        <StatCell
                          value={c.stats.failed}
                          total={c.stats.total}
                        />
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-[#a1a1aa] hover:text-[#18181b]"
                              disabled={pending}
                              aria-label={t('campaigns.table.actions')}
                            >
                              {pending ? (
                                <Spinner className="size-3.5" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                navigate(`/w/${ws.slug}/campaigns/${c.id}`)
                              }
                            >
                              {t('campaigns.action.viewInsights')}
                            </DropdownMenuItem>
                            {(c.status === 'DRAFT' ||
                              c.status === 'SCHEDULED') && (
                              <DropdownMenuItem
                                disabled={launchBlocked}
                                onSelect={() => handleLaunch(c.id)}
                              >
                                {t('campaigns.action.launch')}
                              </DropdownMenuItem>
                            )}
                            {c.status === 'RUNNING' && (
                              <DropdownMenuItem
                                onSelect={() => handlePause(c.id)}
                              >
                                {t('campaigns.action.pause')}
                              </DropdownMenuItem>
                            )}
                            {c.status === 'PAUSED' && (
                              <DropdownMenuItem
                                disabled={launchBlocked}
                                onSelect={() => handleResume(c.id)}
                              >
                                {t('campaigns.action.resume')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onSelect={() => handleDuplicate(c.id)}
                            >
                              {t('campaigns.action.duplicate')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
