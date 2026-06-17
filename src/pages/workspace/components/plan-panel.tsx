import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle,
} from '@/components/ui/card';
import { InfoTip } from '@/components/shared/info-tip';
import type { CurrentWorkspace } from '@/types/api';

// Entitlement keys are open data — new ones appear without a client release —
// so labels resolve through i18n with a humanised fallback (max_members →
// "Max members") instead of a hardcoded catalogue.
function humanize(key: string): string {
  const text = key.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "Your plan": renders whatever feature/limit keys the workspace payload
 * carries. Display only — gating decisions go through lib/plan.ts helpers.
 * The upgrade CTA is disabled until the billing slice ships plan changes.
 */
export function PlanPanel({ workspace }: { workspace: CurrentWorkspace }) {
  const { t, i18n } = useTranslation();
  const features = Object.entries(workspace.planFeatures);
  const limits = Object.entries(workspace.planLimits);
  const label = (key: string) =>
    t(`plan.keys.${key}`, { defaultValue: humanize(key) });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {t('workspace.plan.title')}
            <Badge variant="secondary">{workspace.planCode}</Badge>
          </CardTitle>
          <InfoTip content={t('workspace.plan.hint')} />
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            {t('workspace.plan.features')}
          </h3>
          {features.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('workspace.plan.noFeatures')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {features.map(([key, value]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 wrap-break-word">{label(key)}</span>
                  {typeof value === 'boolean' ? (
                    value ? (
                      <Check
                        role="img"
                        className="size-4 shrink-0 text-emerald-600"
                        aria-label={t('workspace.plan.included')}
                      />
                    ) : (
                      <X
                        role="img"
                        className="text-muted-foreground size-4 shrink-0"
                        aria-label={t('workspace.plan.notIncluded')}
                      />
                    )
                  ) : (
                    <span className="text-muted-foreground min-w-0 wrap-break-word text-end">
                      {/* Values are admin-authored data — only run them through
                          i18next when a translation exists (raw strings could
                          trip interpolation/namespace parsing). */}
                      {i18n.exists(`plan.values.${value}`)
                        ? t(`plan.values.${value}`)
                        : value}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            {t('workspace.plan.limits')}
          </h3>
          {limits.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('workspace.plan.noLimits')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {limits.map(([key, value]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 wrap-break-word">{label(key)}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {/* Latin digits app-wide regardless of locale — the pinned
                        number convention (see lib/money.ts). */}
                    {value === null
                      ? t('workspace.plan.unlimited')
                      : value.toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>

      <CardFooter>
        <InfoTip content={t('workspace.plan.upgradeSoon')}>
          <Button size="sm" variant="outline" disabled>
            {t('workspace.plan.upgrade')}
          </Button>
        </InfoTip>
      </CardFooter>
    </Card>
  );
}
