import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { ServiceLauncher } from '@/components/shared/service-launcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';

/** The right-side header cluster every authed layout shares. */
export function HeaderActions() {
  return (
    <div className="ml-auto flex items-center gap-1">
      <ServiceLauncher />
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}
