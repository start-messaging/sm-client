import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Inverse guard for the public auth pages: an already-authenticated user has no
 * business on /login or /signup, so bounce them to the app.
 */
export function RequireGuest() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
