import { useTranslation } from 'react-i18next';
import { MessageSquare, CheckCircle2, Timer } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAvatarColors, getInitials } from '@/lib/contact-avatar';
import { useAnalyticsOverview } from '@/api/hooks/use-analytics';

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const totalSeconds = Math.round(minutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function StatCard({
  label,
  icon,
  value,
  caption,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex items-start justify-between">
          <span className="text-muted-foreground text-xs font-medium">
            {label}
          </span>
          {icon}
        </div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {caption ? (
          <div className="text-muted-foreground text-xs">{caption}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard "analytics overview" widget: today's stat cards + a top-agents
 * table. Backed by GET .../whatsapp/analytics/overview.
 */
export function AnalyticsOverviewPanel({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useAnalyticsOverview(slug);

  const resolutionRate =
    data && data.conversationsToday > 0
      ? Math.round((data.resolvedToday / data.conversationsToday) * 100)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('workspace.analytics.conversationsToday')}
          icon={
            <MessageSquare className="text-muted-foreground size-4 shrink-0" />
          }
          value={isLoading || !data ? '—' : String(data.conversationsToday)}
        />
        <StatCard
          label={t('workspace.analytics.resolvedToday')}
          icon={
            <CheckCircle2 className="text-muted-foreground size-4 shrink-0" />
          }
          value={isLoading || !data ? '—' : String(data.resolvedToday)}
          caption={
            resolutionRate !== null
              ? t('workspace.analytics.resolutionRate', {
                  rate: resolutionRate,
                })
              : undefined
          }
        />
        <StatCard
          label={t('workspace.analytics.avgResponse')}
          icon={<Timer className="text-muted-foreground size-4 shrink-0" />}
          value={
            isLoading || !data ? '—' : formatMinutes(data.avgResponseMinutes)
          }
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm">
            {t('workspace.analytics.topAgents.title')}
          </CardTitle>
        </CardHeader>
        {isLoading || !data ? (
          <div className="text-muted-foreground px-4 text-sm">
            {t('common.loading')}
          </div>
        ) : data.topAgents.length === 0 ? (
          <div className="text-muted-foreground px-4 text-sm">
            {t('workspace.analytics.topAgents.empty')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t('workspace.analytics.topAgents.agent')}
                </TableHead>
                <TableHead className="text-right">
                  {t('workspace.analytics.topAgents.handled')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topAgents.map((agent) => {
                const colors = getAvatarColors(agent.userId);
                return (
                  <TableRow key={agent.userId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback
                            className={`text-[10px] font-semibold ${colors.bg} ${colors.text}`}
                          >
                            {getInitials(agent.name, agent.userId)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {agent.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {agent.handled}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
