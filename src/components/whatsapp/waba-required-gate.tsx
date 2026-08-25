import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useWabaStatus } from '@/api/hooks/use-whatsapp';
import type { WabaStatus } from '@/api/whatsapp.api';

/** Modules that talk to a connected WABA. Dashboard, Connect, Members, Billing, Settings stay usable. */
const WABA_GATED_SEGMENTS = new Set([
  'inbox',
  'templates',
  'contacts',
  'leads',
  'campaigns',
]);

function moduleSegment(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  // /w/:slug/:segment/...
  return parts[2] ?? '';
}

function isDisconnected(status: WabaStatus | undefined): boolean {
  return status === 'not_connected' || status === 'disconnected';
}

function BlurredChrome() {
  return (
    <div className="flex min-h-[min(520px,100%)] flex-col gap-3" aria-hidden>
      <div className="flex justify-end gap-2">
        <div className="h-8 w-24 rounded-md bg-muted" />
        <div className="h-8 w-32 rounded-md bg-muted" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,14rem)_1fr] gap-3">
        <div className="rounded-lg border bg-muted/50" />
        <div className="rounded-lg border bg-muted/30" />
      </div>
    </div>
  );
}

/**
 * When the workspace has no live WABA, WABA-specific pages (inbox, templates,
 * contacts, leads, campaigns) show a large connect overlay instead of leftover
 * conversations/templates. Children are not mounted, so stale data is not shown.
 */
export function WabaRequiredGate({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const { data, isLoading } = useWabaStatus(slug);
  const gated = WABA_GATED_SEGMENTS.has(moduleSegment(location.pathname));
  const blocked = gated && !isLoading && isDisconnected(data?.status);

  const code =
    data?.status === 'disconnected'
      ? 'WABA_DISCONNECTED'
      : 'WABA_NOT_CONNECTED';

  useEffect(() => {
    if (!blocked) return;
    posthog.capture('blocker_shown', { code });
  }, [blocked, code]);

  if (!blocked) return children;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="pointer-events-none select-none blur-[6px] opacity-50"
        aria-hidden
      >
        <BlurredChrome />
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 p-4">
        <Card
          role="status"
          className="w-full max-w-lg border-amber-200 bg-amber-50 py-6 shadow-lg dark:border-amber-800 dark:bg-amber-950/50"
        >
          <CardHeader className="px-6">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
              <Link2 className="size-5 text-amber-700 dark:text-amber-300" />
            </div>
            <CardTitle className="text-lg">
              {t(`education.${code}.title`)}
            </CardTitle>
            <CardDescription className="text-foreground/80 text-sm leading-relaxed">
              {t(`education.${code}.body`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-6">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t(`education.${code}.note`)}
            </p>
            <Button asChild className="w-fit">
              <Link
                to={`/w/${slug}/connect`}
                onClick={() => posthog.capture('blocker_cta_clicked', { code })}
              >
                {t(`education.${code}.cta`)}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
