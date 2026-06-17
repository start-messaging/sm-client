import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { InfoTip } from '@/components/shared/info-tip';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { PlanPanel } from './components/plan-panel';

/**
 * The workspace home. Modules (inbox, campaigns…) are coming-soon in the
 * sidebar; until they land this page anchors the workspace identity: what it
 * is, where it operates, what plan it's on.
 */
export function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const workspace = useCurrentWorkspace();

  const facts = [
    { label: t('workspace.facts.service'), value: workspace.serviceKey },
    { label: t('workspace.facts.country'), value: workspace.countryCode },
    { label: t('workspace.facts.currency'), value: workspace.defaultCurrency },
    { label: t('workspace.facts.role'), value: workspace.role },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <Badge variant="secondary">{workspace.planCode}</Badge>
        </div>
        <p className="text-muted-foreground" dir="ltr">
          /w/{workspace.slug}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => (
          <Card key={f.label}>
            <CardHeader className="pb-2">
              <CardDescription>{f.label}</CardDescription>
              <CardTitle className="text-lg">{f.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <PlanPanel workspace={workspace} />

      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="flex items-center gap-1.5 font-medium">
            {t('workspace.modulesSoon.title')}
            <InfoTip content={t('workspace.modulesSoon.hint')} />
          </p>
          <p className="text-muted-foreground text-sm">
            {t('workspace.modulesSoon.body')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
