import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useCampaigns } from '@/api/hooks/use-campaigns';
import type { CampaignStatus } from '@/api/campaigns.api';

const STATUS_VARIANT: Record<
  CampaignStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  SCHEDULED: 'outline',
  RUNNING: 'default',
  COMPLETED: 'default',
  PAUSED: 'outline',
  FAILED: 'destructive',
};

export function CampaignsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useCampaigns(ws.slug);

  const campaigns = data?.campaigns ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('campaigns.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('campaigns.subtitle')}
          </p>
        </div>
        <Button size="sm" disabled>
          {t('campaigns.createCta')}
        </Button>
      </div>

      <EducationSlot
        title={t('campaigns.intro.title')}
        body={t('campaigns.intro.body')}
      />

      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

      {!isLoading && campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Megaphone className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">{t('campaigns.empty.title')}</p>
              <p className="text-muted-foreground text-sm">
                {t('campaigns.empty.body')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && campaigns.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {c.templateName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status]}>
                      {t(`campaigns.status.${c.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {c.stats.sent}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {c.stats.delivered}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
