import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/api/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Keep the persisted profile fresh from /me (so `mobileVerified` and the
 * onboarding gate stay current after a reload) and bounce to /login when the
 * session is truly dead. One hook — every authed shell uses the same logic.
 */
export function useMeSync(): void {
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
}
