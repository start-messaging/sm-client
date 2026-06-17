import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { Check, ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { InfoTip } from '@/components/shared/info-tip';
import { UserMenu } from '@/components/layout/user-menu';
import { useMyWorkspaces } from '@/api/hooks/use-workspaces';
import { COMMON_NAV, navForService } from '@/config/service-nav';
import { APP_NAME } from '@/config/app';
import type { CurrentWorkspace } from '@/types/api';

/**
 * The workspace shell's sidebar: header = workspace switcher (siblings of the
 * SAME service only — cross-service moves go through the launcher/gallery),
 * content = the service's module registry (coming-soon items render disabled
 * with an InfoTip), footer = user menu.
 */
export function WorkspaceSidebar({
  workspace,
}: {
  workspace: CurrentWorkspace;
}) {
  const { t } = useTranslation();
  const items = navForService(workspace.serviceKey);

  return (
    <Sidebar>
      <SidebarHeader className="gap-2">
        <WorkspaceSwitcher workspace={workspace} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <NavItem key={item.segment} workspace={workspace} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.workspaceGroup')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {COMMON_NAV.map((item) => (
                <NavItem key={item.segment} workspace={workspace} item={item} />
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

function NavItem({
  workspace,
  item,
}: {
  workspace: CurrentWorkspace;
  item: ReturnType<typeof navForService>[number];
}) {
  const { t } = useTranslation();
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <SidebarMenuItem>
        <InfoTip content={t('nav.comingSoon')} className="w-full">
          <SidebarMenuButton
            disabled
            className="cursor-default opacity-50"
            aria-disabled="true"
          >
            <Icon />
            <span>{t(item.labelKey)}</span>
          </SidebarMenuButton>
        </InfoTip>
      </SidebarMenuItem>
    );
  }

  const to = item.segment
    ? `/w/${workspace.slug}/${item.segment}`
    : `/w/${workspace.slug}`;
  return (
    <SidebarMenuItem>
      <NavLink to={to} end={!item.segment}>
        {({ isActive }) => (
          <SidebarMenuButton asChild isActive={isActive}>
            <span>
              <Icon />
              <span>{t(item.labelKey)}</span>
            </span>
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

function WorkspaceSwitcher({ workspace }: { workspace: CurrentWorkspace }) {
  const { t } = useTranslation();
  const { data: workspaces } = useMyWorkspaces();
  const siblings = (workspaces ?? []).filter(
    (w) => w.serviceKey === workspace.serviceKey,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-start"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {workspace.name}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {t('workspace.planLabel', { plan: workspace.planCode })}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>{t('workspace.switcherLabel')}</DropdownMenuLabel>
        {siblings.map((w) => (
          <DropdownMenuItem key={w.id} asChild>
            <Link to={`/w/${w.slug}`} className="flex items-center gap-2">
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === workspace.id && <Check className="size-4" />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/services/${workspace.serviceKey}/new`}>
            <Plus className="size-4" />
            {t('workspace.newWorkspace')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/services">
            <LayoutGrid className="size-4" />
            {t('launcher.allServices')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
