import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  CreditCard,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Settings,
  Users,
  Contact,
  Link2,
  Zap,
} from 'lucide-react';

export interface ServiceNavItem {
  /** Path segment under /w/:slug ('' = the dashboard index). */
  segment: string;
  labelKey: string;
  icon: LucideIcon;
  /** Module not built yet — rendered disabled with a "coming soon" InfoTip. */
  comingSoon?: boolean;
}

/**
 * THE registry that scopes the sidebar to a workspace's service — the whole
 * "don't show everything" UX is this map. Adding a service to the platform =
 * one entry here; no layout changes. Items marked comingSoon render disabled
 * so users see the service's shape without dead routes.
 */
export const SERVICE_NAV: Record<string, ServiceNavItem[]> = {
  whatsapp: [
    { segment: '', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { segment: 'connect', labelKey: 'nav.connect', icon: Link2 },
    { segment: 'inbox', labelKey: 'nav.inbox', icon: Inbox },
    {
      segment: 'templates',
      labelKey: 'nav.templates',
      icon: LayoutTemplate,
    },
    {
      segment: 'contacts',
      labelKey: 'nav.contacts',
      icon: Contact,
    },
    {
      segment: 'leads',
      labelKey: 'nav.leads',
      icon: KanbanSquare,
    },
    {
      segment: 'campaigns',
      labelKey: 'nav.campaigns',
      icon: Megaphone,
    },
    {
      segment: 'automations',
      labelKey: 'nav.automations',
      icon: Zap,
    },
    {
      segment: 'analytics',
      labelKey: 'nav.analytics',
      icon: BarChart2,
    },
  ],
};

/** Unknown/future services still get a working dashboard. */
export const FALLBACK_NAV: ServiceNavItem[] = [
  { segment: '', labelKey: 'nav.dashboard', icon: LayoutDashboard },
];

/** Modules every workspace has regardless of service (later slices). */
export const COMMON_NAV: ServiceNavItem[] = [
  {
    segment: 'members',
    labelKey: 'nav.members',
    icon: Users,
  },
  {
    segment: 'billing',
    labelKey: 'nav.billing',
    icon: CreditCard,
  },
  {
    segment: 'settings',
    labelKey: 'nav.settings',
    icon: Settings,
  },
];

export function navForService(serviceKey: string): ServiceNavItem[] {
  return SERVICE_NAV[serviceKey] ?? FALLBACK_NAV;
}
