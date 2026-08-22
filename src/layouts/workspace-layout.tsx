import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { HeaderActions } from '@/components/layout/header-actions';
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar';
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';
import { useWorkspace } from '@/api/hooks/use-workspaces';
import { queryKeys } from '@/api/query-keys';
import { useMeSync } from '@/hooks/use-me-sync';
import { toast } from '@/lib/toast';
import { errorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <HeaderActions />
        </header>
        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col p-6',
            lockToViewport ? 'overflow-hidden' : 'overflow-auto',
          )}
        >
          <Outlet context={workspace.data} />
        </main>
      </SidebarInset>
      <WhatsAppFab />
    </SidebarProvider>
  );
}
