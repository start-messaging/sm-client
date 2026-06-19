import { Navigate, Outlet } from 'react-router-dom';
import { useMyWorkspaces } from '@/api/hooks/use-workspaces';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Gate between RequireAuth and the app shell. Mobile verification gates
 * workspace OWNERSHIP, not membership: a fresh signup with no workspaces is
 * funnelled to the onboarding wizard (they need a phone-derived country to
 * CREATE one), but someone who joined a workspace via invite (≥1 membership)
 * is let straight in with just a verified email. The server still enforces the
 * mobile requirement at workspace creation.
 */
export function RequireOnboarded() {
  const mobileVerified = useAuthStore((s) => s.user?.mobileVerified);
  const { data: workspaces, isLoading } = useMyWorkspaces();

  if (mobileVerified !== false) return <Outlet />;

  // Unverified mobile: wait for the membership check before deciding.
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  // An invited member (already belongs somewhere) skips mobile onboarding.
  if (workspaces && workspaces.length > 0) return <Outlet />;

  return <Navigate to="/onboarding/mobile" replace />;
}
