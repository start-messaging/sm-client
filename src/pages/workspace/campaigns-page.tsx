import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Megaphone, MoreHorizontal, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useCampaigns,
  useLaunchCampaign,
  usePauseCampaign,
  useResumeCampaign,
} from '@/api/hooks/use-campaigns';
import { useWabaStatus } from '@/api/hooks/use-whatsapp';
import { toast } from '@/lib/toast';
import type { Campaign, CampaignStatus } from '@/api/campaigns.api';

const META_MANAGER_URL =
  'https://business.facebook.com/latest/whatsapp_manager/payment_methods';

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

function rowHasActions(status: CampaignStatus): boolean {
  return (
    status === 'DRAFT' ||
    status === 'SCHEDULED' ||
    status === 'RUNNING' ||
    status === 'PAUSED'
  );
}

export function CampaignsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();

  const { data, isLoading } = useCampaigns(ws.slug);
  const { data: wabaStatus } = useWabaStatus(ws.slug);

  const launchMutation = useLaunchCampaign(ws.slug);
  const pauseMutation = usePauseCampaign(ws.slug);
  const resumeMutation = useResumeCampaign(ws.slug);

  const campaigns = data?.campaigns ?? [];
  const launchBlocked = wabaStatus?.metaPaymentReady === false;
  const createPath = `/w/${ws.slug}/campaigns/new`;

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

  function actionPending(c: Campaign): boolean {
    return (
      (launchMutation.isPending && launchMutation.variables === c.id) ||
      (pauseMutation.isPending && pauseMutation.variables === c.id) ||
      (resumeMutation.isPending && resumeMutation.variables === c.id)
    );
  }

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
        <Button size="sm" asChild>
          <Link to={createPath}>
            <Plus className="mr-1.5 size-3.5" />
            {t('campaigns.createCta')}
          </Link>
        </Button>
      </div>

      <EducationSlot
        title={t('campaigns.intro.title')}
        body={t('campaigns.intro.body')}
        storageKey="campaigns-intro"
      />

      {launchBlocked && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-medium">
              {t('education.META_PAYMENT_REQUIRED.title')}
            </p>
            <p className="text-muted-foreground text-sm">
              {t('education.META_PAYMENT_REQUIRED.body')}
            </p>
            <p className="text-muted-foreground text-xs">
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
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner className="size-4" />
          {t('common.loading')}
        </p>
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
            <Button size="sm" asChild>
              <Link to={createPath}>{t('campaigns.createCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && campaigns.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('campaigns.table.name')}</TableHead>
                <TableHead>{t('campaigns.table.template')}</TableHead>
                <TableHead>{t('campaigns.table.status')}</TableHead>
                <TableHead className="text-right">
                  {t('campaigns.table.sent')}
                </TableHead>
                <TableHead className="text-right">
                  {t('campaigns.table.delivered')}
                </TableHead>
                <TableHead className="text-right">
                  {t('campaigns.table.read')}
                </TableHead>
                <TableHead className="text-right">
                  {t('campaigns.table.failed')}
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const pending = actionPending(c);
                return (
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
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.stats.sent}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.stats.delivered}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.stats.read}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.stats.failed}
                    </TableCell>
                    <TableCell className="text-right">
                      {rowHasActions(c.status) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
