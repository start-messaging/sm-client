import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthResult } from '@/types/api';

/**
 * GET /auth/me — the source of truth for "who am I + which workspaces". Enabled
 * only when authenticated. On success the app layout syncs the active context
 * back into the store so a reload re-hydrates the active workspace/role.
 */
export function useMe() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authApi.me,
    enabled: isAuthed,
    staleTime: STALE.STANDARD,
  });
}

/**
 * Refetch identity- and user-scoped data after a fresh sign-in, WITHOUT dropping
 * user-independent reference data (the public services catalogue). A blanket
 * invalidateQueries() would needlessly refetch that on every auth flow.
 */
function invalidateUserScoped(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
  void qc.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result: AuthResult) => {
      setSession(result);
      invalidateUserScoped(qc);
    },
  });
}

export function useSignup() {
  // Signup creates identity only; no session yet → returns { verificationToken }.
  return useMutation({ mutationFn: authApi.signup });
}

export function useVerifyOtp() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (result: AuthResult) => {
      setSession(result);
      invalidateUserScoped(qc);
    },
  });
}

/**
 * Switch active workspace. The backend returns only a fresh access token (with
 * the new workspace + role baked in).
 *
 * Cache-isolation guarantee (order matters): set the token, then **await** a
 * full cache reset BEFORE flipping the store to the new workspace. The other
 * order would open a window where the store says "workspace B" while the cache
 * still holds workspace A's data — which a render in that window would leak.
 */
export function useSwitchWorkspace() {
  const qc = useQueryClient();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setActiveContext = useAuthStore((s) => s.setActiveContext);
  return useMutation({
    mutationFn: (input: {
      workspaceId: string;
      role: AuthResult['activeWorkspaceRole'];
    }) => authApi.switchWorkspace(input.workspaceId),
    onSuccess: async (result, input) => {
      setAccessToken(result.accessToken);
      await qc.resetQueries();
      setActiveContext({
        activeWorkspaceId: input.workspaceId,
        activeWorkspaceRole: input.role,
      });
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    // Clear locally regardless of the server result (token may already be dead).
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}
