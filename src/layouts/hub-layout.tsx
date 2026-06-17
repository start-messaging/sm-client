import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeaderActions } from '@/components/layout/header-actions';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';
import { useMeSync } from '@/hooks/use-me-sync';

/**
 * The "hub" shell: gallery + workspace creation (/services/*). No sidebar —
 * these pages are about choosing a context, not working inside one. Shares
 * the workspace shell's me-sync so a stale session still bounces to /login.
 */
export function HubLayout() {
  const { t } = useTranslation();
  useMeSync();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <span className="font-semibold">{t('common.appName')}</span>
        <HeaderActions />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <Outlet />
      </main>
      <WhatsAppFab />
    </div>
  );
}
