import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAvatarColors, getInitials } from '@/lib/contact-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAgentStats, useMessageErrors } from '@/api/hooks/use-analytics';

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function AgentAnalyticsPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const agentQuery = useAgentStats(slug!, from, to);
  const errorQuery = useMessageErrors(slug!, from, to);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[15px] font-semibold text-[#18181b]">
          {t('analytics.agentPerformance')}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('analytics.agentPerformance')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {agentQuery.isLoading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              {t('common.loading')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('workspace.analytics.topAgents.agent')}</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Messages Sent</TableHead>
                  <TableHead className="text-right">Avg Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentQuery.data?.agents.map((a) => {
                  const colors = getAvatarColors(a.userId);
                  return (
                    <TableRow key={a.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback
                              className={`text-[10px] font-semibold ${colors.bg} ${colors.text}`}
                            >
                              {getInitials(a.name, a.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{a.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {a.conversationsHandled}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {a.messagesSent}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {a.resolutionMinutes != null ? `${a.resolutionMinutes}m` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!agentQuery.data?.agents.length && !agentQuery.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t('analytics.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('analytics.failedMessages')}</CardTitle>
        </CardHeader>
        <CardContent>
          {errorQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              {t('common.loading')}
            </div>
          ) : !errorQuery.data?.errors.length ? (
            <p className="text-sm text-muted-foreground">{t('analytics.noErrors')}</p>
          ) : (
            <div className="space-y-2">
              {errorQuery.data.errors.map((e, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {e.errorCode ?? 'Unknown'}
                    </span>
                    <span className="text-muted-foreground">×{e.count}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(e.lastOccurredAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.errorReason}</p>
                  <p className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    {e.fix}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
