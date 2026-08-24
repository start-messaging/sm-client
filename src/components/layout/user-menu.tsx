import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Globe, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/api/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';
import { LANGUAGES } from '@/config/languages';

function initials(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const activeLang = i18n.resolvedLanguage ?? 'en';

  const display = user?.fullName || user?.email || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar>
            <AvatarFallback>{display ? initials(display) : '?'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">
            {user?.fullName ?? t('common.appName')}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-medium text-[#a1a1aa] py-1">
          <Globe className="size-3" />
          {t('common.language')}
        </DropdownMenuLabel>
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => void i18n.changeLanguage(lang.code)}
            className="flex items-center justify-between"
          >
            <span>{lang.label}</span>
            {activeLang === lang.code && <Check className="size-3.5 text-[#18181b]" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            logout.mutate(undefined, {
              onSettled: () => void navigate('/login'),
            })
          }
        >
          <LogOut />
          {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
