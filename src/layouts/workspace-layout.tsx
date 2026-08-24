import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, LayoutGrid } from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';
import { WabaRequiredGate } from '@/components/whatsapp/waba-required-gate';
import { useWorkspace } from '@/api/hooks/use-workspaces';
import { queryKeys } from '@/api/query-keys';
import { useMeSync } from '@/hooks/use-me-sync';
import { toast } from '@/lib/toast';
import { errorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { navForService, COMMON_NAV } from '@/config/service-nav';

function WorkspaceHeader({ workspace }: { workspace: { serviceKey: string } }) {
  const title = usePageTitle(workspace.serviceKey);
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-[#e4e4e7] bg-white px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-[#71717a]" />
        <span className="text-[15px] font-semibold text-[#18181b]">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8 text-[#71717a]">
          <Bell size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="size-8 text-[#71717a]">
          <LayoutGrid size={16} />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}

function usePageTitle(serviceKey: string): string {
  const { t } = useTranslation();
  const location = useLocation();
  const allNav = [...navForService(serviceKey), ...COMMON_NAV];

  const segments = location.pathname.split('/').filter(Boolean);
  // /w/:slug/:segment or /w/:slug (dashboard)
  const segment = segments[2] ?? '';
  const item = allNav.find((n) => n.segment === segment);
  return item ? t(item.labelKey) : t('nav.dashboard');
}

/**
 * The workspace shell for /w/:slug/*. The URL is the source of truth: the slug
 * resolves to a workspace (membership enforced server-side — non-members get
 * the same 404 as a bad slug), context is remembered for the `/` redirect, and
 * the sidebar scopes itself to the workspace's service.
 */
export function WorkspaceLayout() {
  const { slug } = useParams();
  const location = useLocation();
  const qc = useQueryClient();
  const lockToViewport = location.pathname.endsWith('/inbox');
  const setActiveContext = useAuthStore((s) => s.setActiveContext);
  const clearActiveContext = useAuthStore((s) => s.clearActiveContext);
  const workspace = useWorkspace(slug);
  useMeSync();

  // Remember where the user works so `/` brings them straight back.
  useEffect(() => {
    if (workspace.data) {
      setActiveContext({
        id: workspace.data.id,
        slug: workspace.data.slug,
        role: workspace.data.role,
      });
    }
  }, [workspace.data, setActiveContext]);

  // Only a failure with NO data counts as "workspace gone" (a failed
  // BACKGROUND refetch keeps cached data — never eject a healthy session).
  const gone = workspace.isError && !workspace.data;

  // Side effects of the bounce live in an effect, not the render body: the
  // toast, forgetting the stale slug (so `/` stops trying it), and refreshing
  // the cached list it may still sit in.
  useEffect(() => {
    if (!gone) return;
    if (workspace.error) toast.error(errorMessage(workspace.error));
    clearActiveContext();
    void qc.invalidateQueries({ queryKey: queryKeys.workspaces.mine() });
  }, [gone, workspace.error, clearActiveContext, qc]);

  if (gone) {
    // Stale link, revoked membership, or deleted workspace — back to the hub.
    return <Navigate to="/services/whatsapp/new" replace />;
  }
  if (!workspace.data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <WorkspaceSidebar workspace={workspace.data} />
      <SidebarInset className="h-svh overflow-hidden">
        <WorkspaceHeader workspace={workspace.data} />
        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col p-6',
            lockToViewport ? 'overflow-hidden' : 'overflow-auto',
          )}
        >
          <WabaRequiredGate slug={workspace.data.slug}>
            <Outlet context={workspace.data} />
          </WabaRequiredGate>
        </main>
      </SidebarInset>
      <WhatsAppFab />
    </SidebarProvider>
  );
}
