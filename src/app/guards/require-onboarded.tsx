import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Gate between RequireAuth and the app shell: an authenticated user whose
 * mobile is not yet verified is funnelled into the onboarding wizard (steps
 * 3–4). Covers fresh signups AND returning logins — login responses carry
 * `mobileVerified`, and the app layout's /me sync keeps it fresh.
 */
export function RequireOnboarded() {
  const mobileVerified = useAuthStore((s) => s.user?.mobileVerified);
  if (mobileVerified === false) {
    return <Navigate to="/onboarding/mobile" replace />;
  }
  return <Outlet />;
}
