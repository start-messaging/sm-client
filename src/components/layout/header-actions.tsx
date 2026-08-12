import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';

/** The right-side header cluster every authed layout shares. */
export function HeaderActions() {
  return (
    <div className="ml-auto flex items-center gap-1">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}
