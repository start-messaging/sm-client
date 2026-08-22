import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The error codes that map to educational blockers on the client. */
export type BlockerCode =
  | 'WABA_NOT_CONNECTED'
  | 'WABA_DISCONNECTED'
  | 'META_PAYMENT_REQUIRED'
  | 'META_BILLING_ERROR'
  | 'OUTSIDE_CUSTOMER_CARE_WINDOW'
  | 'MESSAGE_WINDOW_CLOSED'
  | 'TEMPLATE_NOT_APPROVED'
  | 'PHONE_QUALITY_LIMIT'
  | 'PLAN_FEATURE_REQUIRED'
  | 'SUBSCRIPTION_PAST_DUE';

/** CTA config — use `href` for external links, `onClick` for in-app navigation. */
export interface BlockerCta {
  href?: string;
  onClick?: () => void;
  /** Whether the link opens in a new tab (defaults true for external `href`). */
  external?: boolean;
}

export interface BlockerBannerProps {
  code: BlockerCode;
  /** Override the CTA action — the default is just the label from i18n. */
  cta?: BlockerCta;
  /** Severity colouring: 'error' (red) | 'warning' (amber) | 'info' (blue). */
  variant?: 'error' | 'warning' | 'info';
  /** Allow the user to dismiss (hide) the banner temporarily. */
  dismissible?: boolean;
  className?: string;
}

/**
 * Maps stable server error codes to human-readable educational blockers.
 * Never shows raw Meta JSON. Always explains cause + fix and, where relevant,
 * distinguishes Meta billing from the CRM subscription.
 *
 * PostHog events are fired on mount and on CTA click so product can see which
 * blockers are most common.
 */
export function BlockerBanner({
  code,
  cta,
  variant = 'warning',
  dismissible = false,
  className,
}: BlockerBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const title = t(`education.${code}.title`);
  const body = t(`education.${code}.body`);
  const ctaLabel = t(`education.${code}.cta`);
  // Some codes have an extra note (e.g. "separate from CRM subscription").
  const note = t(`education.${code}.note`, { defaultValue: '' });

  const variantStyles: Record<string, string> = {
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  };

  const iconStyles: Record<string, string> = {
    error: 'text-destructive',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        variantStyles[variant],
        className,
      )}
    >
      <AlertTriangle
        className={cn('mt-0.5 size-4 shrink-0', iconStyles[variant])}
      />

      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm opacity-90">{body}</p>
        {note && <p className="text-xs opacity-70">{note}</p>}

        {cta && (
          <div className="pt-1">
            {cta.href ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={cta.href}
                  target={cta.external !== false ? '_blank' : undefined}
                  rel={
                    cta.external !== false ? 'noopener noreferrer' : undefined
                  }
                >
                  {ctaLabel}
                  {cta.external !== false && (
                    <ExternalLink className="ml-1.5 size-3" />
                  )}
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={cta.onClick}>
                {ctaLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          className="hover:opacity-70 shrink-0 self-start"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
