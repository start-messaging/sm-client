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
import { WhatsAppFab } from '@/components/shared/whatsapp-fab';
import { useMe } from '@/api/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Authenticated layout (the app shell). Uses shadcn's SidebarProvider so the nav
 * is responsive: a fixed sidebar on desktop, a slide-in sheet on mobile (toggled
 * by SidebarTrigger in the header). Also re-syncs the user profile from /me
 * after a reload (keeps `mobileVerified` fresh for the onboarding gate), and
 * bounces to /login if that session is dead. RequireAuth+RequireOnboarded wrap
 * this.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const me = useMe();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (me.data) setUser(me.data);
  }, [me.data, setUser]);

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
      <WhatsAppFab />
    </SidebarProvider>
  );
}
