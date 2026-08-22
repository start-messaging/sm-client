import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';
import { queryClient } from '@/lib/query-client';
import i18n from '@/lib/i18n';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initThemeListener } from '@/stores/theme.store';
import { env } from '@/config/env';

/**
 * Single composition point for every app-wide provider. Order matters:
 *   i18n (text) → Query (server cache) → app. The theme listener is wired in an
 *   effect so OS dark-mode changes apply live while in 'system' mode.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => initThemeListener(), []);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          {children}
          <Toaster />
          {env.isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
