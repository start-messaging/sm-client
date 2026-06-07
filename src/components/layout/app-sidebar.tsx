import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users } from 'lucide-react';
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
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { APP_NAME } from '@/config/app';

const NAV = [
  { to: '/', labelKey: 'shell.dashboard', icon: LayoutDashboard, end: true },
  { to: '/members', labelKey: 'shell.members', icon: Users, end: false },
] as const;

/**
 * The customer app sidebar. Uses shadcn's Sidebar primitives so it's responsive:
 * a fixed rail on desktop, a slide-in sheet drawer on mobile (toggled by the
 * <SidebarTrigger/> in the layout header). Holds the workspace switcher up top,
 * the nav, and the user menu in the footer.
 */
export function AppSidebar() {
  const { t } = useTranslation();

  return (
    <Sidebar>
      <SidebarHeader className="gap-2">
        <div className="flex h-10 items-center px-2 font-semibold">
          {t('common.appName')}
        </div>
        <div className="px-2">
          <WorkspaceSwitcher />
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
