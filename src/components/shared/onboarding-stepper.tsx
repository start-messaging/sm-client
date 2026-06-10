import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_KEYS = [
  'onboarding.steps.basicInfo',
  'onboarding.steps.verifyEmail',
  'onboarding.steps.mobile',
  'onboarding.steps.verifyMobile',
] as const;

/**
 * The 1–4 registration progress indicator shared by the signup page (steps
 * 1–2) and the mobile onboarding page (steps 3–4). `current` is 1-based.
 */
export function OnboardingStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const { t } = useTranslation();
  return (
    <ol className="flex items-center justify-center gap-2" aria-label="steps">
      {STEP_KEYS.map((key, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={key} className="flex items-center gap-2">
            {i > 0 && <span className="bg-border h-px w-5 sm:w-8" />}
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  active && 'border-primary text-primary border-2',
                  !done &&
                    !active &&
                    'border-border text-muted-foreground border',
                )}
              >
                {done ? <Check className="size-3.5" /> : step}
              </span>
              <span
                className={cn(
                  'hidden text-xs sm:block',
                  active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {t(key)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
