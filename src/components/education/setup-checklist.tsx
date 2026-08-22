import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ChecklistStepStatus = 'done' | 'pending' | 'blocked';

export interface ChecklistStep {
  id: string;
  /** Short action label (e.g. "Connect your WABA"). */
  label: string;
  /** Optional one-liner expanding on why this step matters. */
  description?: string;
  status: ChecklistStepStatus;
  /** Optional CTA for the step's action — only shown when not done. */
  cta?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export interface SetupChecklistProps {
  steps: ChecklistStep[];
  /** Override card title — defaults to the i18n "Get set up" key. */
  title?: string;
  className?: string;
}

const STATUS_ICON: Record<
  ChecklistStepStatus,
  React.FC<{ className?: string }>
> = {
  done: ({ className }) => (
    <CheckCircle2 className={cn('text-green-500', className)} />
  ),
  pending: ({ className }) => (
    <Circle className={cn('text-muted-foreground', className)} />
  ),
  blocked: ({ className }) => (
    <Lock className={cn('text-amber-500', className)} />
  ),
};

const STATUS_BADGE_VARIANT: Record<
  ChecklistStepStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  done: 'default',
  pending: 'secondary',
  blocked: 'outline',
};

/**
 * A multi-step setup checklist for guided onboarding journeys.
 * Shows the state of each step (done/pending/blocked) with an optional CTA.
 * Used on the dashboard to guide: connect → Meta pay → template → first send.
 */
export function SetupChecklist({
  steps,
  title,
  className,
}: SetupChecklistProps) {
  const { t } = useTranslation();

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const allDone = doneCount === steps.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {title ?? t('education.checklist.title')}
          </CardTitle>
          <span className="text-muted-foreground text-sm tabular-nums">
            {doneCount}/{steps.length}
          </span>
        </div>
        {allDone && (
          <CardDescription className="text-green-600 dark:text-green-400">
            All steps complete — you're ready to send!
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-1 pt-0">
        {steps.map((step, i) => {
          const Icon = STATUS_ICON[step.status];
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 rounded-lg p-3 transition-colors',
                step.status === 'done' && 'opacity-70',
                step.status === 'pending' && 'hover:bg-muted/50',
                step.status === 'blocked' &&
                  'bg-amber-50/50 dark:bg-amber-950/20',
              )}
            >
              {/* Step number + icon */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Icon className="size-5" />
                {i < steps.length - 1 && (
                  <div className="bg-border h-full w-px grow" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      step.status === 'done' && 'line-through',
                    )}
                  >
                    {step.label}
                  </span>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[step.status]}
                    className="text-xs"
                  >
                    {t(
                      `education.checklist.step${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`,
                    )}
                  </Badge>
                </div>

                {step.description && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {step.description}
                  </p>
                )}

                {step.cta && step.status !== 'done' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-fit"
                    onClick={step.cta.onClick}
                    disabled={step.cta.disabled}
                  >
                    {step.cta.label}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
