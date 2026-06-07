import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Route guard for authenticated pages. Wrap the protected branch of the route
 * tree with this. No session → redirect to /login, preserving where the user was
 * headed (in `?redirect=`) so login can send them back.
 */
export function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}
