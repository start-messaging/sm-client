import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { InfoTip } from '@/components/shared/info-tip';
import {
  ServiceStatus,
  type PublicService,
  type WorkspaceSummary,
} from '@/types/api';

/**
 * One service in the gallery. Without a workspace the card sells the service
 * ("Start a workspace"); with one it becomes a door ("Open" the most recent +
 * a quiet "new workspace" that lets paid users grow — free users hit the
 * server's plan cap with an upgrade message). A `coming_soon` service is a
 * roadmap TEASER: visible with plain "coming soon" copy, no CTA — the server
 * rejects creation for it anyway (SERVICE_NOT_AVAILABLE).
 */
export function ServiceCard({
  service,
  workspaces,
}: {
  service: PublicService;
  workspaces: WorkspaceSummary[];
}) {
  const { t } = useTranslation();
  const hasWorkspace = workspaces.length > 0;
  const comingSoon = service.status === ServiceStatus.COMING_SOON;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xs font-bold">
            {service.short}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{service.name}</span>
              {service.status === ServiceStatus.BETA && (
                <InfoTip content={t('home.betaHint')}>
                  <Badge variant="secondary">{t('home.badge.beta')}</Badge>
                </InfoTip>
              )}
              {comingSoon && (
                <Badge variant="outline">{t('home.badge.comingSoon')}</Badge>
              )}
            </div>
            {hasWorkspace && (
              <p className="text-muted-foreground truncate text-xs">
                {t('home.workspaceCount', { count: workspaces.length })}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground text-sm">
          {service.description ?? ''}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        {comingSoon && !hasWorkspace ? (
          <p className="text-muted-foreground text-sm">
            {t('home.comingSoonCard')}
          </p>
        ) : hasWorkspace ? (
          <>
            <Button asChild className="flex-1">
              <Link to={`/w/${workspaces[0].slug}`}>{t('home.open')}</Link>
            </Button>
            {/* No "+ new" on a coming_soon service — existing workspaces keep
                their door (e.g. a service demoted after launch), creation of
                new ones is server-rejected anyway. */}
            {!comingSoon && (
              <Button asChild variant="outline" size="icon">
                <Link
                  to={`/services/${service.key}/new`}
                  aria-label={t('home.newWorkspace')}
                >
                  <Plus className="size-4" />
                </Link>
              </Button>
            )}
          </>
        ) : (
          <Button asChild className="w-full">
            <Link to={`/services/${service.key}/new`}>
              {t('home.startWorkspace')}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
