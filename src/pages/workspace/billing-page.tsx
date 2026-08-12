import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EducationSlot } from '@/components/education/education-slot';
import { BlockerBanner } from '@/components/education/blocker-banner';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useSubscription } from '@/api/hooks/use-billing';
import type { SubscriptionStatus } from '@/api/billing.api';

const STATUS_VARIANT: Record<
  SubscriptionStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  cancelled: 'outline',
  none: 'outline',
};

export function BillingPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data: sub, isLoading } = useSubscription(ws.slug);

  const isPastDue = sub?.status === 'past_due';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('billing.title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('billing.subtitle')}</p>
      </div>

      {/* Hard blocker when subscription is past due */}
      {isPastDue && (
        <BlockerBanner
          code="SUBSCRIPTION_PAST_DUE"
          variant="error"
          cta={{ onClick: () => undefined }}
        />
      )}

      {/* Educational context: CRM billing vs Meta billing */}
      <EducationSlot
        title={t('billing.intro.title')}
        body={t('billing.intro.body')}
      />

      {/* CRM subscription status */}
      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

      {!isLoading && sub && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {t('billing.currentPlan')}
                </CardTitle>
                <CardDescription>
                  {t('billing.planCode', { plan: ws.planCode })}
                </CardDescription>
              </div>
              <Badge variant={STATUS_VARIANT[sub.status]}>
                {t(`billing.status.${sub.status}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {sub.currentPeriodEnd && (
              <p className="text-muted-foreground text-sm">
                Renews{' '}
                {new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
            <Button variant="outline" size="sm" className="w-fit" disabled>
              {t('billing.upgrade')}
            </Button>
            <p className="text-muted-foreground text-xs">
              {t('billing.upgradeSoon')}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && (!sub || sub.status === 'none') && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-medium">{t('billing.noSubscription.title')}</p>
            <p className="text-muted-foreground text-sm">
              {t('billing.noSubscription.body')}
            </p>
            <Button disabled>{t('billing.upgrade')}</Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Meta billing note — always visible; distinguishes Meta from our billing */}
      <Card className="border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            WhatsApp conversation fees
          </CardTitle>
          <CardDescription className="text-foreground/80">
            {t('billing.metaBillingNote')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://business.facebook.com/billing_hub/accounts"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('billing.openMetaManager')}
              <ExternalLink className="ml-1.5 size-3" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
