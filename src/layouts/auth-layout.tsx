import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';

/**
 * Layout for the public auth pages (login / signup / verify-otp): a centered
 * card area with language + theme switchers available pre-login, so a first-time
 * visitor can use the app in their language. The RequireGuest guard wraps this.
 */
export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <span className="font-semibold">{t('common.appName')}</span>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Outlet />
      </main>
      <WhatsAppFab />
    </div>
  );
}
