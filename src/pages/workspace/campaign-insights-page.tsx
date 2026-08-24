import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { BlockerBanner } from '@/components/education/blocker-banner';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useCampaignAnalytics, useCampaigns } from '@/api/hooks/use-campaigns';
import { STATUS_VARIANT } from './components/campaign-status';
import { errorMessage } from '@/lib/errors';
import { isApiError } from '@/types/error';

const SERIES_COLOR = {
  delivered: '#059669',
  read: '#2563eb',
  failed: '#dc2626',
} as const;

function pctCaption(part: number, total: number): string | undefined {
  if (total <= 0) return undefined;
  return `${Math.round((part / total) * 1000) / 10}%`;
}

function StatCard({
  label,
  value,
  caption,
  captionClassName,
}: {
  label: string;
  value: number;
  caption?: string;
  captionClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
        <div className="text-3xl font-bold tracking-tight">
          {value.toLocaleString('en-US')}
        </div>
        {caption ? (
          <div className={captionClassName ?? 'text-muted-foreground text-xs'}>
            {caption}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatChartDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function CampaignInsightsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const ws = useCurrentWorkspace();

  const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns(
    ws.slug,
  );
  const campaign = campaignsData?.campaigns.find((c) => c.id === id);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useCampaignAnalytics(ws.slug, id ?? '');

  const featureBlocked =
    isApiError(analyticsError) &&
    analyticsError.code === 'PLAN_FEATURE_REQUIRED';
  const otherError = analyticsError && !featureBlocked;

  const listPath = `/w/${ws.slug}/campaigns`;
  const stats = analytics?.stats;

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground -ml-2 w-fit"
        onClick={() => navigate(listPath)}
      >
        <ArrowLeft className="mr-1.5 size-3.5 rtl:rotate-180" />
        {t('campaigns.insights.back')}
      </Button>

      {campaignsLoading && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner className="size-4" />
          {t('common.loading')}
        </p>
      )}

      {!campaignsLoading && !campaign && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {t('campaigns.insights.notFound')}
            </p>
          </CardContent>
        </Card>
      )}

      {campaign && (
        <>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              {campaign.name}
            </h1>
            <Badge variant={STATUS_VARIANT[campaign.status]}>
              {t(`campaigns.status.${campaign.status}`)}
            </Badge>
            {campaign.launchedAt && (
              <span className="text-muted-foreground text-xs">
                {t('campaigns.insights.launched', {
                  date: new Date(campaign.launchedAt).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  ),
                })}
              </span>
            )}
          </div>

          {analyticsLoading && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner className="size-4" />
              {t('common.loading')}
            </p>
          )}

          {featureBlocked && (
            <BlockerBanner
              code="PLAN_FEATURE_REQUIRED"
              variant="info"
              cta={{ onClick: () => navigate(`/w/${ws.slug}/billing`) }}
            />
          )}

          {otherError && (
            <p className="text-destructive text-sm">
              {errorMessage(analyticsError)}
            </p>
          )}

          {stats && (
            <>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  label={t('campaigns.insights.stats.total')}
                  value={stats.total}
                />
                <StatCard
                  label={t('campaigns.insights.stats.sent')}
                  value={stats.sent}
                  caption={pctCaption(stats.sent, stats.total)}
                />
                <StatCard
                  label={t('campaigns.insights.stats.delivered')}
                  value={stats.delivered}
                  caption={pctCaption(stats.delivered, stats.total)}
                  captionClassName="text-xs text-emerald-600"
                />
                <StatCard
                  label={t('campaigns.insights.stats.read')}
                  value={stats.read}
                  caption={pctCaption(stats.read, stats.total)}
                  captionClassName="text-xs text-blue-600"
                />
                <StatCard
                  label={t('campaigns.insights.stats.failed')}
                  value={stats.failed}
                  caption={pctCaption(stats.failed, stats.total)}
                  captionClassName="text-destructive text-xs"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t('campaigns.insights.chart.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!analytics || analytics.timeseries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t('campaigns.insights.chart.empty')}
                    </p>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.timeseries}>
                          <CartesianGrid
                            strokeDasharray="0"
                            vertical={false}
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatChartDate}
                            tick={{
                              fontSize: 11,
                              fill: 'var(--muted-foreground)',
                            }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{
                              fontSize: 11,
                              fill: 'var(--muted-foreground)',
                            }}
                            tickLine={false}
                            axisLine={false}
                            width={36}
                          />
                          <RechartsTooltip
                            labelFormatter={(label) =>
                              formatChartDate(String(label))
                            }
                            contentStyle={{
                              background: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12 }}
                            formatter={(value: string) =>
                              t(`campaigns.insights.chart.legend.${value}`)
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="delivered"
                            stroke={SERIES_COLOR.delivered}
                            fill={SERIES_COLOR.delivered}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="read"
                            stroke={SERIES_COLOR.read}
                            fill={SERIES_COLOR.read}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="failed"
                            stroke={SERIES_COLOR.failed}
                            fill={SERIES_COLOR.failed}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
