import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvailableServices } from '@/api/hooks/use-services';
import { useMyWorkspaces } from '@/api/hooks/use-workspaces';
import { useAuthStore } from '@/stores/auth.store';
import { ServiceStatus } from '@/types/api';
import { ServiceCard } from './components/service-card';

/**
 * The all-services gallery (/services): every service available (priced) in
 * the user's country. Cards adapt — no workspace on a service yet → "Start a
 * workspace"; already onboarded → "Open" + "new workspace". This page is the
 * launcher's "view everything" target; day-to-day work happens inside /w/:slug.
 */
export function ServicesGalleryPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: services, isLoading: servicesLoading } = useAvailableServices();
  const { data: workspaces } = useMyWorkspaces();
  // Wait for BOTH queries: rendering cards before the workspace list arrives
  // would flash "Start a workspace" on services the user already owns.
  const isLoading = servicesLoading || workspaces === undefined;
  // Coming-soon teasers don't count as "live here" — when they're all there
  // is, the country notice still shows above them.
  const available = (services ?? []).filter(
    (s) => s.status !== ServiceStatus.COMING_SOON,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.welcome', {
            name: user?.fullName ?? user?.email ?? '',
          })}
        </h1>
        <p className="text-muted-foreground">{t('home.chooseService')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !services || services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="font-medium">{t('home.empty.title')}</p>
            <p className="text-muted-foreground text-sm">
              {t('home.empty.body')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {available.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-12 text-center">
                <p className="font-medium">{t('home.empty.title')}</p>
                <p className="text-muted-foreground text-sm">
                  {t('home.empty.body')}
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard
                key={s.key}
                service={s}
                workspaces={(workspaces ?? []).filter(
                  (w) => w.serviceKey === s.key,
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
