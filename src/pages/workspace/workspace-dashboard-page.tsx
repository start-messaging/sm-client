import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SetupChecklist } from '@/components/education/setup-checklist';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useWabaStatus } from '@/api/hooks/use-whatsapp';
import { useTemplates } from '@/api/hooks/use-templates';
import { PlanPanel } from './components/plan-panel';
import { WalletPanel } from './components/wallet-panel';
import type { ChecklistStep } from '@/components/education/setup-checklist';

/**
 * The workspace home for WhatsApp CRM. Shows the 4-step setup checklist
 * (Connect → Meta pay → first template → first send) and workspace facts.
 * The "modules soon" placeholder is replaced now that all module pages exist.
 */
export function WorkspaceDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();

  const { data: wabaStatus } = useWabaStatus(workspace.slug);
  const { data: templatesData } = useTemplates(workspace.slug);

  const isConnected = wabaStatus?.status === 'connected';
  const metaPayReady = wabaStatus?.metaPaymentReady === true;
  const hasApprovedTemplate =
    (templatesData?.templates ?? []).some((t) => t.status === 'APPROVED');

  const setupSteps: ChecklistStep[] = [
    {
      id: 'connect',
      label: t('education.steps.connect.label'),
      description: t('education.steps.connect.description'),
      status: isConnected ? 'done' : 'pending',
      cta: isConnected
        ? undefined
        : {
            label: t('connect.cta'),
            onClick: () => navigate('connect'),
          },
    },
    {
      id: 'metaPay',
      label: t('education.steps.metaPay.label'),
      description: t('education.steps.metaPay.description'),
      status: !isConnected ? 'blocked' : metaPayReady ? 'done' : 'pending',
      cta:
        isConnected && !metaPayReady
          ? {
              label: t('education.META_PAYMENT_REQUIRED.cta'),
              onClick: () =>
                window.open(
                  'https://business.facebook.com/billing_hub/accounts',
                  '_blank',
                ),
            }
          : undefined,
    },
    {
      id: 'firstTemplate',
      label: t('education.steps.firstTemplate.label'),
      description: t('education.steps.firstTemplate.description'),
      status: !isConnected
        ? 'blocked'
        : hasApprovedTemplate
          ? 'done'
          : 'pending',
      cta:
        isConnected && !hasApprovedTemplate
          ? {
              label: t('templates.createCta'),
              onClick: () => navigate('templates'),
            }
          : undefined,
    },
    {
      id: 'firstSend',
      label: t('education.steps.firstSend.label'),
      description: t('education.steps.firstSend.description'),
      status:
        isConnected && metaPayReady && hasApprovedTemplate ? 'pending' : 'blocked',
      cta:
        isConnected && metaPayReady && hasApprovedTemplate
          ? {
              label: t('inbox.title'),
              onClick: () => navigate('inbox'),
            }
          : undefined,
    },
  ];

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

      {/* Setup checklist — the main onboarding guide for new workspaces */}
      <SetupChecklist steps={setupSteps} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WalletPanel slug={workspace.slug} />
        <PlanPanel workspace={workspace} />
      </div>
    </div>
  );
}
