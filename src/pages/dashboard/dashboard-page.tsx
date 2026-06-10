import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvailableServices } from '@/api/hooks/use-services';
import { useAuthStore } from '@/stores/auth.store';
import { ServiceCard } from './components/service-card';

/**
 * The logged-in home. No workspaces exist yet, so this is the "choose a
 * service to start your workspace" surface: every service available (priced)
 * in the user's country, as cards. The workspace flow itself is the next slice.
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: services, isLoading } = useAvailableServices();

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.key} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}
