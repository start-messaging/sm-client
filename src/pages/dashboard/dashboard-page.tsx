import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCurrentWorkspace } from '@/api/hooks/use-workspaces';
import { useAuthStore } from '@/stores/auth.store';

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: workspace } = useCurrentWorkspace();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome', {
            name: user?.fullName ?? user?.email ?? '',
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{workspace?.name ?? t('shell.noWorkspace')}</CardTitle>
          <CardDescription>{t('dashboard.placeholder')}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {workspace ? (
            <ul className="flex flex-col gap-1">
              <li>Country: {workspace.countryCode}</li>
              <li>Currency: {workspace.defaultCurrency}</li>
              <li>Role: {workspace.role}</li>
              <li>Status: {workspace.status}</li>
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
