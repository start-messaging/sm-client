import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { APP_NAME } from '@/config/app';

// The workspace switcher + members nav return with the workspace slice.
const NAV = [
  { to: '/', labelKey: 'shell.dashboard', icon: LayoutDashboard, end: true },
] as const;

/**
 * The customer app sidebar. Uses shadcn's Sidebar primitives so it's responsive:
 * a fixed rail on desktop, a slide-in sheet drawer on mobile (toggled by the
 * <SidebarTrigger/> in the layout header). Nav + the user menu in the footer.
 */
export function AppSidebar() {
  const { t } = useTranslation();

  return (
    <Sidebar>
      <SidebarHeader className="gap-2">
        <div className="flex h-10 items-center px-2 font-semibold">
          {t('common.appName')}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ to, labelKey, icon: Icon, end }) => (
                <SidebarMenuItem key={to}>
                  <NavLink to={to} end={end}>
                    {({ isActive }) => (
                      <SidebarMenuButton asChild isActive={isActive}>
                        <span>
                          <Icon />
                          <span>{t(labelKey)}</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2">
          <span className="text-muted-foreground truncate text-xs">
            {APP_NAME}
          </span>
          <UserMenu />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
