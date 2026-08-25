import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Plus, Zap } from 'lucide-react';
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
  SidebarHeader,
} from '@/components/ui/sidebar';
import { InfoTip } from '@/components/shared/info-tip';
import { useMyWorkspaces } from '@/api/hooks/use-workspaces';
import { useUnreadCount } from '@/api/hooks/use-messages';
import { useContactsCount } from '@/api/hooks/use-contacts';
import { useNotificationStore } from '@/stores/notification.store';
import { COMMON_NAV, navForService } from '@/config/service-nav';
import { planLimit } from '@/lib/plan';
import { getInitials } from '@/lib/contact-avatar';
import type { CurrentWorkspace } from '@/types/api';
import type { ServiceNavItem } from '@/config/service-nav';

export function WorkspaceSidebar({
  workspace,
}: {
  workspace: CurrentWorkspace;
}) {
  const { t } = useTranslation();
  const items = navForService(workspace.serviceKey);

  return (
    <Sidebar
      className="border-r border-[#e4e4e7] bg-white"
      style={{ '--sidebar-width': '240px' } as React.CSSProperties}
    >
      <SidebarHeader className="p-0">
        <WorkspaceSwitcher workspace={workspace} />
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-0 overflow-y-auto px-2 py-2">
        {/* Service nav group */}
        <div className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a1a1aa]">
            {t(
              `nav.serviceGroup.${workspace.serviceKey}`,
              workspace.serviceKey.toUpperCase(),
            )}
          </p>
          {items.map((item) => (
            <NavItem key={item.segment} workspace={workspace} item={item} />
          ))}
        </div>

        {/* Separator */}
        <div className="my-1.5 border-t border-[#f4f4f5]" />

        {/* Common nav group */}
        <div className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a1a1aa]">
            {t('nav.commonGroup')}
          </p>
          {COMMON_NAV.map((item) => (
            <NavItem key={item.segment} workspace={workspace} item={item} />
          ))}
        </div>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <PlanCard workspace={workspace} />
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Nav item ────────────────────────────────────────────────────────────────

function NavItem({
  workspace,
  item,
}: {
  workspace: CurrentWorkspace;
  item: ServiceNavItem;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const isInbox = item.segment === 'inbox';
  const isCampaigns = item.segment === 'campaigns';

  const { data: unread } = useUnreadCount(workspace.slug, { enabled: isInbox });
  const hasUpdate = useNotificationStore(
    (s) => s.hasUpdate[item.segment] ?? false,
  );

  const iconEl = (
    <span className="relative inline-flex shrink-0">
      <Icon size={15} />
      {(hasUpdate || isCampaigns) && (
        <span className="absolute -right-0.5 -top-0.5 flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
        </span>
      )}
    </span>
  );

  if (item.comingSoon) {
    return (
      <InfoTip content={t('nav.comingSoon')} className="w-full">
        <button
          type="button"
          disabled
          className="flex h-9 w-full cursor-default items-center gap-2 rounded-md px-2 text-sm text-[#a1a1aa] opacity-60"
        >
          {iconEl}
          <span>{t(item.labelKey)}</span>
        </button>
      </InfoTip>
    );
  }

  const to = item.segment
    ? `/w/${workspace.slug}/${item.segment}`
    : `/w/${workspace.slug}`;

  return (
    <NavLink to={to} end={!item.segment}>
      {({ isActive }) => (
        <span
          className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm ${
            isActive
              ? 'bg-[#f4f4f5] font-medium text-[#18181b]'
              : 'font-normal text-[#3f3f46] hover:bg-[#f4f4f5]'
          }`}
        >
          {iconEl}
          <span className="flex-1">{t(item.labelKey)}</span>
          {isInbox && (unread?.total ?? 0) > 0 && (
            <span className="rounded-full bg-red-500 px-[6px] py-px text-[10px] font-semibold leading-none text-white">
              {unread!.total}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

// ── Workspace switcher header ────────────────────────────────────────────────

function WorkspaceSwitcher({ workspace }: { workspace: CurrentWorkspace }) {
  const { t } = useTranslation();
  const { data: workspaces } = useMyWorkspaces();
  const siblings = (workspaces ?? []).filter(
    (w) => w.serviceKey === workspace.serviceKey,
  );

  const initials = getInitials(workspace.name, workspace.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-3 text-start hover:bg-[#f9f9f9]"
        >
          {/* Dark square avatar */}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[5px] bg-[#18181b] text-[11px] font-semibold text-white">
            {initials}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight text-[#18181b]">
              {workspace.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-[#71717a]">
              workspace
            </span>
          </span>

          {/* Plan badge */}
          <span className="shrink-0 rounded-[4px] border border-[#e4e4e7] px-[5px] py-px text-[10px] font-semibold uppercase tracking-wide text-[#71717a]">
            {workspace.planCode}
          </span>

          <ChevronsUpDown size={14} className="shrink-0 text-[#a1a1aa]" />
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Plan card (bottom) ───────────────────────────────────────────────────────

function PlanCard({ workspace }: { workspace: CurrentWorkspace }) {
  const { t } = useTranslation();
  const { data: contactCount } = useContactsCount(workspace.slug);
  const maxContacts = planLimit(workspace, 'max_contacts');

  const pct =
    maxContacts != null && maxContacts > 0 && contactCount != null
      ? Math.min(100, Math.round((contactCount / maxContacts) * 100))
      : null;

  return (
    <div className="rounded-lg bg-[#f4f4f5] px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#18181b]">
          {workspace.planCode} {t('sidebar.plan')}
        </span>
        <Link
          to={`/w/${workspace.slug}/billing`}
          className="flex items-center gap-0.5 text-[11px] font-medium text-[#18181b] hover:underline"
        >
          <Zap size={10} />
          {t('sidebar.upgrade')}
        </Link>
      </div>

      {maxContacts != null && (
        <>
          <p className="text-[11px] text-[#71717a]">
            {contactCount ?? '—'} / {maxContacts.toLocaleString()}{' '}
            {t('sidebar.contacts')}
          </p>
          {pct !== null && (
            <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-[#e4e4e7]">
              <div
                className="h-full rounded-full bg-[#18181b]"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
