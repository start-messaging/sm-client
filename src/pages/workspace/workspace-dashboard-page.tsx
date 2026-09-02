import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  CheckCircle2,
  Timer,
  Users,
  TrendingUp,
} from 'lucide-react';import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SetupChecklist } from '@/components/education/setup-checklist';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useWabaStatus } from '@/api/hooks/use-whatsapp';
import { useTemplates } from '@/api/hooks/use-templates';
import { useAnalyticsOverview } from '@/api/hooks/use-analytics';
import { useAuthStore } from '@/stores/auth.store';
import { getAvatarColors, getInitials } from '@/lib/contact-avatar';
import type { ChecklistStep } from '@/components/education/setup-checklist';

// ── NumberHealthWidget ────────────────────────────────────────────────────────

function NumberHealthWidget({ qualityRating }: { qualityRating: string | null }) {
  if (!qualityRating || qualityRating === 'UNKNOWN') return null;
  const isGreen = qualityRating === 'GREEN';
  const isYellow = qualityRating === 'YELLOW';
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        isGreen
          ? 'border-green-200 bg-green-50 text-green-800'
          : isYellow
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      <span className="font-medium">Number quality: {qualityRating}</span>
      {isGreen ? (
        <span className="ml-2">Your number is in good standing.</span>
      ) : (
        <>
          <span className="ml-2">
            {isYellow
              ? 'Reduce marketing volume and ensure opt-outs are respected.'
              : "Message sending may be restricted. Review Meta's guidance."}
          </span>
          <a
            href="https://business.facebook.com/wa/manage/phone-numbers/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 underline"
          >
            Manage in Meta
          </a>
        </>
      )}
    </div>
  );
}

// ── Greeting ─────────────────────────────────────────────────────────────────
function timeGreeting(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// ── Date-range segmented control ─────────────────────────────────────────────

type DateRange = 'today' | '7d' | '30d';

function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const { t } = useTranslation();
  const options: { label: string; value: DateRange }[] = [
    { label: t('dashboard.range.today'), value: 'today' },
    { label: t('dashboard.range.7d'), value: '7d' },
    { label: t('dashboard.range.30d'), value: '30d' },
  ];
  return (
    <div className="flex items-center rounded-md bg-[#f4f4f5] p-[2px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[4px] px-3 py-1 text-[13px] transition-all ${
            value === opt.value
              ? 'bg-white font-medium text-[#18181b] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'font-normal text-[#71717a] hover:text-[#18181b]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className="border-[#e4e4e7]">
      <CardContent className="p-[18px]">
        <div className="mb-3 flex items-start justify-between">
          <span className="text-[12px] font-medium text-[#71717a]">
            {label}
          </span>
          <Icon size={15} className="text-[#a1a1aa]" />
        </div>
        <div
          className={`text-[30px] font-bold leading-none tracking-[-0.02em] ${
            highlight ? 'text-[#d97706]' : 'text-[#18181b]'
          }`}
        >
          {value}
        </div>
        {caption && (
          <p
            className={`mt-1.5 text-[12px] ${highlight ? 'text-[#d97706]' : 'text-[#71717a]'}`}
          >
            {caption}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── FRR badge ────────────────────────────────────────────────────────────────

function FrrBadge({ rate }: { rate: number }) {
  const className =
    rate >= 80
      ? 'bg-[#dcfce7] text-[#16a34a]'
      : rate >= 60
        ? 'bg-[#fef9c3] text-[#ca8a04]'
        : 'bg-[#fee2e2] text-[#dc2626]';
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {rate}%
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<DateRange>('today');

  const { data: wabaStatus } = useWabaStatus(workspace.slug);
  const { data: templatesData } = useTemplates(workspace.slug);
  const { data: analytics, isLoading } = useAnalyticsOverview(workspace.slug);

  const isConnected = wabaStatus?.status === 'connected';
  const hasApprovedTemplate = (templatesData?.templates ?? []).some(
    (tpl) => tpl.status === 'APPROVED',
  );

  const firstName = user?.fullName?.split(' ')[0] ?? user?.email ?? '';

  const resolutionRate =
    analytics && analytics.conversationsToday > 0
      ? Math.round(
          (analytics.resolvedToday / analytics.conversationsToday) * 100,
        )
      : null;

  const setupSteps: ChecklistStep[] = [
    {
      id: 'connect',
      label: t('education.steps.connect.label'),
      description: t('education.steps.connect.description'),
      status: isConnected ? 'done' : 'pending',
      cta: isConnected
        ? undefined
        : { label: t('connect.cta'), onClick: () => navigate('connect') },
    },
    {
      id: 'firstTemplate',
      label: t('education.steps.firstTemplate.label'),
      description: t('education.steps.firstTemplate.description'),
      status: !isConnected
        ? 'blocked'
        : hasApprovedTemplate
          ? 'done'
          : 'pending',
      cta:
        isConnected && !hasApprovedTemplate
          ? {
              label: t('templates.createCta'),
              onClick: () => navigate('templates'),
            }
          : undefined,
    },
    {
      id: 'firstSend',
      label: t('education.steps.firstSend.label'),
      description: t('education.steps.firstSend.description'),
      status: isConnected && hasApprovedTemplate ? 'pending' : 'blocked',
      cta:
        isConnected && hasApprovedTemplate
          ? { label: t('inbox.title'), onClick: () => navigate('inbox') }
          : undefined,
    },
  ];

  const setupDone = setupSteps.every((s) => s.status === 'done');

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold leading-tight text-[#18181b]">
            {t(`dashboard.greeting.${timeGreeting()}`, { name: firstName })}
          </h1>
          <p className="text-[13px] text-[#71717a]">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <DateRangeControl value={range} onChange={setRange} />
      </div>

      {/* Number health widget — shown only when connected */}
      {isConnected && (
        <NumberHealthWidget qualityRating={wabaStatus?.qualityRating ?? null} />
      )}

      {/* Setup checklist — secondary once all steps are done */}
      {!setupDone && <SetupChecklist steps={setupSteps} />}
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('workspace.analytics.conversationsToday')}
          value={
            isLoading || !analytics ? '—' : String(analytics.conversationsToday)
          }
          icon={MessageSquare}
        />
        <StatCard
          label={t('workspace.analytics.resolvedToday')}
          value={
            isLoading || !analytics ? '—' : String(analytics.resolvedToday)
          }
          caption={
            resolutionRate !== null
              ? t('workspace.analytics.resolutionRate', {
                  rate: resolutionRate,
                })
              : undefined
          }
          icon={CheckCircle2}
        />
        <StatCard
          label={t('workspace.analytics.avgResponse')}
          value={
            isLoading || !analytics
              ? '—'
              : formatMinutes(analytics.avgResponseMinutes)
          }
          icon={Timer}
        />
        <StatCard
          label={t('dashboard.openConversations')}
          value={
            isLoading || !analytics
              ? '—'
              : String(analytics.conversationsToday - analytics.resolvedToday)
          }
          caption={
            analytics &&
            analytics.conversationsToday - analytics.resolvedToday > 0
              ? t('dashboard.openConversationsHint')
              : undefined
          }
          highlight={
            !!analytics &&
            analytics.conversationsToday - analytics.resolvedToday > 0
          }
          icon={Users}
        />
      </div>

      {/* Top agents table */}
      {analytics && analytics.topAgents.length > 0 && (
        <Card className="overflow-hidden border-[#e4e4e7]">
          <CardContent className="p-0">
            <div className="border-b border-[#e4e4e7] px-4 py-3">
              <span className="text-[13px] font-semibold text-[#18181b]">
                {t('workspace.analytics.topAgents.title')}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#fafafa]">
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('workspace.analytics.topAgents.agent')}
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-[#a1a1aa]">
                    {t('workspace.analytics.topAgents.handled')}
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-[#a1a1aa]">
                    {t('dashboard.frr')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topAgents.map((agent) => {
                  const colors = getAvatarColors(agent.userId);
                  const frr =
                    agent.handled > 0
                      ? Math.round(
                          (agent.handled / analytics.conversationsToday) * 100,
                        )
                      : 0;
                  return (
                    <TableRow key={agent.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-[18px]">
                            <AvatarFallback
                              className={`text-[8px] font-semibold ${colors.bg} ${colors.text}`}
                            >
                              {getInitials(agent.name, agent.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[13px] font-medium text-[#18181b]">
                            {agent.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[13px] text-[#71717a]">
                        {agent.handled}
                      </TableCell>
                      <TableCell className="text-right">
                        <FrrBadge rate={frr} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Setup checklist in secondary position once all done */}
      {setupDone && (
        <div className="flex items-center gap-2 text-[13px] text-[#71717a]">
          <TrendingUp size={14} className="text-green-500" />
          {t('dashboard.setupComplete')}
        </div>
      )}
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const totalSeconds = Math.round(minutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
