import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useMe } from '@/api/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Authenticated layout (the app shell). Uses shadcn's SidebarProvider so the nav
 * is responsive: a fixed sidebar on desktop, a slide-in sheet on mobile (toggled
 * by SidebarTrigger in the header). Also rehydrates the active workspace/role
 * from /me after a reload, and bounces to /login if that session is dead. The
 * RequireAuth guard wraps this.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const me = useMe();
  const setActiveContext = useAuthStore((s) => s.setActiveContext);

  useEffect(() => {
    if (me.data) {
      setActiveContext({
        activeWorkspaceId: me.data.activeWorkspaceId,
        activeWorkspaceRole: me.data.activeWorkspaceRole,
        user: me.data.user,
      });
    }
  }, [me.data, setActiveContext]);

  useEffect(() => {
    if (me.isError && !useAuthStore.getState().isAuthenticated()) {
      void navigate('/login', { replace: true });
    }
  }, [me.isError, navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
